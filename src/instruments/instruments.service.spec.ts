import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Marketdata } from 'src/marketdata/marketdata.entity';
import { ILike } from 'typeorm';
import { FindAllInstrumentsDto } from './dto/find-all.dto';
import { Instrument } from './instrument.entity';
import { InstrumentType } from './instruments.enums';
import { InstrumentsService } from './instruments.service';

describe('InstrumentsService', () => {
  let service: InstrumentsService;

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    addCommonTableExpression: jest.fn().mockReturnThis(),
    innerJoinAndMapMany: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),

    getOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentsService,
        {
          provide: getRepositoryToken(Instrument),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InstrumentsService>(InstrumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findArsInstrument', () => {
    it('should return ARS instrument', async () => {
      const arsInstrument = { id: 1, ticker: 'ARS' } as Instrument;

      jest.spyOn(mockRepository, 'findOne').mockResolvedValueOnce(arsInstrument);

      const foundInstrument = await service.findArsInstrument();

      expect(mockRepository.findOne).toHaveBeenLastCalledWith({ where: { ticker: 'ARS' } });
      expect(foundInstrument).toEqual(arsInstrument);
    });

    it('should throw NotFoundException when an instrument is not found', async () => {
      jest.spyOn(mockRepository, 'findOne').mockResolvedValueOnce(null);
      await expect(service.findArsInstrument()).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithLatestMarketdataByTicker', () => {
    it('should return an instrument with latest marketdata', async () => {
      const instrument = {
        id: 47,
        ticker: 'PAMP',
        name: 'Pampa Holding S.A.',
        type: InstrumentType.Stock,
        marketdata: [{ close: 123.45 }] as Marketdata[],
      } as Instrument;

      jest.spyOn(mockRepository, 'getOne').mockResolvedValueOnce(instrument);

      const foundInstrument = await service.findOneWithLatestMarketdataByTicker('PAMP');

      expect(mockRepository.findOne).toHaveBeenLastCalledWith({ where: { ticker: 'ARS' } });
      expect(foundInstrument).toEqual(instrument);
    });

    it('should throw NotFoundException when an instrument is not found', async () => {
      jest.spyOn(mockRepository, 'getOne').mockResolvedValueOnce(null);
      await expect(service.findOneWithLatestMarketdataByTicker('PAMP')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    describe('should return an array of instruments', () => {
      const instrument1 = { id: 1 } as Instrument;
      const instrument2 = { id: 2 } as Instrument;

      beforeEach(() => {
        jest.spyOn(mockRepository, 'find')
          .mockResolvedValueOnce([instrument1, instrument2] as Instrument[]);
      });

      it('without q', async () => {
        const findAllDto = {} as FindAllInstrumentsDto;

        const foundInstruments = await service.findAll(findAllDto);

        expect(mockRepository.find).toHaveBeenCalled();
        expect(foundInstruments).toEqual([instrument1, instrument2]);
      });

      it('when q is undefined', async () => {
        const findAllDto = { query: undefined } as FindAllInstrumentsDto;

        const foundInstruments = await service.findAll(findAllDto);

        expect(mockRepository.find).toHaveBeenCalled();
        expect(foundInstruments).toEqual([instrument1, instrument2]);
      });

      it('when q is an empty string', async () => {
        const findAllDto = { query: '' } as FindAllInstrumentsDto;

        const foundInstruments = await service.findAll(findAllDto);

        expect(mockRepository.find).toHaveBeenCalled();
        expect(foundInstruments).toEqual([instrument1, instrument2]);
      });
    });

    describe('should return filtered instruments', () => {
      it('when q is not an empty string', async () => {
        const instrument1 = { id: 1, ticker: 'BPAT', name: 'Banco Patagonia' } as Instrument;

        jest.spyOn(mockRepository, 'find').mockResolvedValueOnce([instrument1]);

        const findAllDto = { query: 'pat' } as FindAllInstrumentsDto;

        const foundInstruments = await service.findAll(findAllDto);

        expect(mockRepository.find).toHaveBeenLastCalledWith({
          where: [
            { name: ILike('%pat%') },
            { ticker: ILike('%pat%') },
          ],
        });
        expect(foundInstruments).toEqual([instrument1]);
      });
    });

  });
});
