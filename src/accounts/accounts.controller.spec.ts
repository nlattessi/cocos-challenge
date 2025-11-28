import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from 'src/portfolio/portfolio.service';
import request from 'supertest';
import { AccountsController } from './accounts.controller';
import { App } from 'supertest/types';
import { PortfolioEntity } from 'src/portfolio/portfolio.entity';

describe('AccountsController', () => {
  let app: INestApplication<App>;

  const mockPortfolioService = {
    getPortfolioByAccountNumber: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        PortfolioService,
        {
          provide: PortfolioService,
          useValue: mockPortfolioService,
        }
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('GET /accounts/:accountNumber/portfolio', () => {
    it('should return a complete portfolio', () => {
      const portfolio = {
        accountTotal: 915100,
        arsAvailable: 753000,
        assets: [
          {
            lastClosePrice: 925.85,
            name: 'Pampa Holding S.A.',
            performance: -0.18,
            sharesAmount: 40,
            ticker: 'PAMP',
            totalValue: 37100,
          },
          {
            lastClosePrice: 229.5,
            name: 'MetroGAS S.A.',
            performance: -8.2,
            sharesAmount: 500,
            ticker: 'METR',
            totalValue: 125000,
          },
        ],
      } as PortfolioEntity;

      jest.spyOn(mockPortfolioService, 'getPortfolioByAccountNumber').mockResolvedValueOnce(portfolio);

      return request(app.getHttpServer())
        .get('/accounts/1000/portfolio')
        .expect(200)
        .expect({
          accountTotal: 915100,
          arsAvailable: 753000,
          assets: [
            {
              name: 'Pampa Holding S.A.',
              performance: -0.18,
              sharesAmount: 40,
              ticker: 'PAMP',
              totalValue: 37100,
            },
            {
              name: 'MetroGAS S.A.',
              performance: -8.2,
              sharesAmount: 500,
              ticker: 'METR',
              totalValue: 125000,
            },
          ],
        });
    });
  });
});
