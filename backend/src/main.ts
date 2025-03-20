import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: '*', // Allow all origins for development; replace with specific domain in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept',
  })

  await app.listen(3000)
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err)
})
