import { Module } from '@nestjs/common';
import { GenDefinitionController } from './gen-definition.controller';
import { GeneratorService } from './gen-definition.service';

@Module({
  controllers: [GenDefinitionController],
  providers: [GeneratorService],
})
export class GeneratorModule {}
