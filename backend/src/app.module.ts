import { join } from 'path'

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AwsModule } from './aws/aws.module'
import { DatabaseService } from './database/database.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', '..', 'frontend', 'dist'),
      serveRoot: '/', // Serves frontend at root
    }),
    AwsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
