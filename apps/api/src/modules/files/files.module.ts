import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { SettingsModule } from '../settings/settings.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilePolicyService } from './file-policy.service';

@Module({
  imports: [SettingsModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService, FilePolicyService],
})
export class FilesModule {}
