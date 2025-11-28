import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Instrument } from './instrument.entity';
import { InstrumentsController } from './instruments.controller';
import { InstrumentType } from './instruments.enums';
import { InstrumentsService } from './instruments.service';

describe('InstrumentsController', () => {
  let app: INestApplication<App>;

  const mockInstrumentsService = {
    findAll: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstrumentsController],
      providers: [
        InstrumentsService,
        {
          provide: InstrumentsService,
          useValue: mockInstrumentsService,
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

  describe('GET /instruments', () => {
    it('should return an array of instruments', async () => {
      const pampaInstrument = { id: 47, ticker: 'PAMP', name: 'Pampa Holding S.A.', type: InstrumentType.Stock } as Instrument;
      const bmaInstrument = { id: 31, ticker: 'BMA', name: 'Banco Macro S.A.', type: InstrumentType.Stock } as Instrument;

      jest.spyOn(mockInstrumentsService, 'findAll')
        .mockResolvedValue([pampaInstrument, bmaInstrument] as Instrument[]);

      return request(app.getHttpServer())
        .get('/instruments')
        .query({ query: 'S.A.' })
        .expect(200)
        .expect([
          { ticker: 'PAMP', name: 'Pampa Holding S.A.', type: 'ACCIONES' },
          { ticker: 'BMA', name: 'Banco Macro S.A.', type: 'ACCIONES' }
        ]);
    });

    it('should fails when query empty', async () => {
      return request(app.getHttpServer())
        .get('/instruments')
        .query({ query: '' })
        .expect(400)
        .expect({
          message: [
            'query must be longer than or equal to 1 characters',
            'query should not be empty'
          ],
          error: 'Bad Request',
          statusCode: 400
        });
    });
  });
});
