import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import { PrismaService } from '../prisma/prisma.service';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class SearchService {
  private client: SearchServiceClient;
  private geminiModel: any;
  private projectId = process.env.GOOGLE_PROJECT_ID;
  private location = process.env.VERTEX_LOCATION || 'global';
  private collectionId =
    process.env.VERTEX_COLLECTION_ID || 'default_collection';
  private dataStoreId = process.env.VERTEX_DATA_STORE_ID;

  constructor(private readonly prisma: PrismaService) {
    // El cliente buscará automáticamente la variable GOOGLE_APPLICATION_CREDENTIALS
    this.client = new SearchServiceClient();

    // Inicializar Vertex AI Generative AI (sin API Key, usa credenciales de Google Cloud)
    try {
      const vertexAI = new VertexAI({
        project: this.projectId,
        location: 'us-central1', // Vertex AI Generative AI requiere región específica
      });
      this.geminiModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });
      console.log(
        '✅ Vertex AI Generative AI inicializado correctamente (us-central1)',
      );
    } catch (error) {
      console.error('❌ Error inicializando Vertex AI Generative AI:', error);
      this.geminiModel = null;
    }
  }

  async search(query: string) {
    if (!this.projectId || !this.dataStoreId) {
      throw new InternalServerErrorException(
        'Faltan configuraciones de Vertex AI en el .env',
      );
    }

    const servingConfig =
      this.client.projectLocationCollectionEngineServingConfigPath(
        this.projectId,
        this.location,
        this.collectionId,
        this.dataStoreId,
        'default_search',
      );

    const request = {
      pageSize: 5,
      query: query,
      servingConfig: servingConfig,
      contentSearchSpec: {
        snippetSpec: { returnSnippet: true },
      },
    };

    try {
      console.log(`🔎 Buscando en Vertex AI: "${query}"...`);
      const response = await this.client.search(request);

      const results = response[0];
      const rawResponse = response[2];
      const summary = rawResponse?.summary;

      const cleanResults = results.map((result) => {
        const doc = result.document;
        // Se usa Record<string, unknown> en lugar de any para mayor seguridad de tipos
        const data = doc?.derivedStructData as
          | Record<string, unknown>
          | undefined;

        // Se extraen los valores asumiendo que existen y tienen las propiedades requeridas
        const title = data?.title as string | undefined;
        const link = data?.link as string | undefined;

        // Para arrays u objetos anidados con formato desconocido, usamos casteos defensivos
        const snippetsArray = data?.snippets as
          | Array<{ snippet?: string }>
          | undefined;
        const snippetText = snippetsArray?.[0]?.snippet;

        const extractiveSegments = data?.extractiveSegments as
          | Array<{ pageNumber?: string }>
          | undefined;
        const pageNum = extractiveSegments?.[0]?.pageNumber;

        return {
          id: doc?.id,
          title: title || 'Documento sin título',
          link: link || '',
          snippet: snippetText || '',
          pageNumber: pageNum || null,
        };
      });

      return {
        ai_summary: summary?.summaryText || null,
        documents: cleanResults,
      };
    } catch (error) {
      console.error('❌ Error en Vertex AI Search:', error);
      throw new InternalServerErrorException(
        'Error al consultar la base de conocimiento legal',
      );
    }
  }
}
