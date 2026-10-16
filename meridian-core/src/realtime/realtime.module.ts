import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotifyGateway } from './notify.gateway';
import { NotificationsController } from './notifications.controller';

/* Global so any feature module can notify customers or admins. */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotifyGateway],
  exports: [NotificationsService],
})
export class RealtimeModule {}
