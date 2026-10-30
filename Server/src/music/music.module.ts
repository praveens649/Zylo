import { Module } from '@nestjs/common';
import { MusicAdminController } from './music-admin.controller.js';
import { MusicAdminService } from './music-admin.service.js';
import { MusicController } from './music.controller.js';
import { MusicService } from './music.service.js';

/**
 * Zylo Music — subscription streaming product.
 * Plan purchase uses the shared order + Stripe fulfilment pipeline;
 * catalog search/playback is gated on an ACTIVE MusicSubscription and
 * proxied to the public iTunes/Deezer APIs server-side.
 */
@Module({
  controllers: [MusicController, MusicAdminController],
  providers: [MusicService, MusicAdminService],
  exports: [MusicService],
})
export class MusicModule {}
