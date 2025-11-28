import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
    ) { }

    async findOne(id: number): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('user with this id not found');
        }

        return user;
    }

    async findOneByAccountNumber(accountNumber: string): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { accountNumber },
        });

        if (!user) {
            throw new NotFoundException('user with this account number not found');
        }

        return user;
    }
}
