import { describe, it, expect, beforeEach, vi } from 'vitest'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseService } from './database/database.service'

describe('AppController', () => {
  let appController: AppController
  let appService: Partial<AppService>
  let dbService: Partial<DatabaseService>

  beforeEach(() => {
    // Create mocks for AppService and DatabaseService
    appService = {
      getHealth: vi.fn().mockReturnValue({ status: 'ok' }),
    }

    dbService = {
      query: vi.fn().mockResolvedValue({
        rows: [{ current_database: 'test_db' }],
      }),
    }

    // Instantiate the controller with the mocked services
    appController = new AppController(
      appService as AppService,
      dbService as DatabaseService
    )
  })

  describe('getHealth', () => {
    it('should return the health status from the app service', () => {
      const result = appController.getHealth()
      expect(appService.getHealth).toHaveBeenCalled()
      expect(result).toEqual({ status: 'ok' })
    })
  })

  describe('getCurrentDatabase', () => {
    it('should return the current database name from the db service', async () => {
      const result = await appController.getCurrentDatabase()
      expect(dbService.query).toHaveBeenCalledWith('SELECT current_database();')
      expect(result).toEqual({ database: 'test_db' })
    })
  })
})
