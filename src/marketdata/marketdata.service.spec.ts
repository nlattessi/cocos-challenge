import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Instrument } from 'src/instruments/instrument.entity';
import { Marketdata } from './marketdata.entity';
import { MarketdataService } from './marketdata.service';

describe('MarketdataService', () => {
  let service: MarketdataService;

  const mockRepository = {
    findOne: jest.fn(),

    createQueryBuilder: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketdataService,
        {
          provide: getRepositoryToken(Marketdata),
          useValue: mockRepository,
        }
      ],
    }).compile();

    service = module.get<MarketdataService>(MarketdataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return found marketdata', async () => {
      const id = 123;
      const testMarketdata = { id } as Marketdata;

      jest.spyOn(mockRepository, 'findOne').mockResolvedValue(testMarketdata);

      const foundMarketdata = await service.findOne(id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: {
          instrument: true,
        },
      });
      expect(foundMarketdata).toEqual(testMarketdata);
    });

    it('should throw NotFoundException when a marketdata is not found', async () => {
      jest.spyOn(mockRepository, 'findOne').mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLastClosePriceByInstrumentId', () => {
    it('should return close price', async () => {
      const instrumentId = 123;
      const instrument = { id: instrumentId } as Instrument;

      const close = 123.45;
      const testMarketdata = { id: 123, close, instrument } as Marketdata;

      jest.spyOn(mockRepository, 'getOne')
        .mockResolvedValue(testMarketdata as Marketdata);

      const foundClose = await service.findLastClosePriceByInstrumentId(instrumentId);

      expect(foundClose).toEqual(close);
    });

    it('should throw NotFoundException when a marketdata is not found', async () => {
      jest.spyOn(mockRepository, 'getOne').mockResolvedValue(null);
      await expect(service.findLastClosePriceByInstrumentId(1)).rejects.toThrow(NotFoundException);
    });
  });
});
