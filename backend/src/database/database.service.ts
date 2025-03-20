import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import * as dotenv from 'dotenv'
import { Client, QueryResult, QueryResultRow } from 'pg'

dotenv.config()

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client: Client
  private readonly logger = new Logger(DatabaseService.name)

  constructor() {
    console.log('🔌 Connecting to PostgreSQL')
    console.log(process.env.RDS_DB_INSTANCE)
    console.log(process.env.RDS_DB_USERNAME)
    console.log(process.env.RDS_DB_PASSWORD)
    console.log(process.env.RDS_DB_NAME)
    this.client = new Client({
      host: process.env.RDS_DB_INSTANCE,
      port: 5432,
      user: process.env.RDS_DB_USERNAME,
      password: process.env.RDS_DB_PASSWORD,
      database: process.env.RDS_DB_NAME,
    })
  }

  async onModuleInit() {
    try {
      // await this.client.connect();
      this.logger.log('✅ Connected to PostgreSQL')
    } catch (error) {
      const err = error as Error

      this.logger.error('❌ Failed to connect to PostgreSQL:', err.message)
    }
  }

  async query<T extends QueryResultRow>(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<QueryResult<T>> {
    return this.client.query<T>(query, params)
  }

  async onModuleDestroy() {
    await this.client.end()
    console.log('❌ Disconnected from PostgreSQL')
  }
}
