import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn().mockResolvedValue({ rows: [] }), // Mock query method
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DatabaseService, useValue: mockDatabaseService }, // Mock DatabaseService
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "I am healthy!"', () => {
      expect(appController.getHealth()).toBe('I am healthy!');
    });
  });
});
