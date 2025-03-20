import { Controller, Get } from '@nestjs/common'

import { AppService } from './app.service'
import { DatabaseService } from './database/database.service' // Import DatabaseService

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dbService: DatabaseService // Inject DatabaseService
  ) {}

  @Get('/api/health')
  getHealth(): { status: string } {
    return this.appService.getHealth()
  }

  @Get('/api/get_db')
  async getCurrentDatabase() {
    const result = await this.dbService.query('SELECT current_database();')
    return { database: result.rows[0].current_database }
  }
}
