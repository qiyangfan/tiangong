import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { SettingsModule } from '../settings/settings.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [SettingsModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
