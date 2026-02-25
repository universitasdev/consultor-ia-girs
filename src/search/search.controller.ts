import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search - Observaciones Legales')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}
}
