import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return found user', async () => {
      const id = 123;
      const testUser = { id } as User;

      jest.spyOn(mockRepository, 'findOne')
        .mockResolvedValue(testUser as User);

      const foundInstrument = await service.findOne(id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(foundInstrument).toEqual(testUser);
    });

    it('should throw NotFoundException when an user is not found', async () => {
      jest.spyOn(mockRepository, 'findOne').mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByAccountNumber', () => {
    it('should return found user', async () => {
      const accountNumber = '1000';
      const testUser = { id: 1, accountNumber } as User;

      jest.spyOn(mockRepository, 'findOne')
        .mockResolvedValue(testUser as User);

      const foundInstrument = await service.findOneByAccountNumber(accountNumber);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { accountNumber } });
      expect(foundInstrument).toEqual(testUser);
    });

    it('should throw NotFoundException when an user is not found', async () => {
      jest.spyOn(mockRepository, 'findOne').mockResolvedValue(null);
      await expect(service.findOneByAccountNumber('1000')).rejects.toThrow(NotFoundException);
    });
  });

});
