import { Test, TestingModule } from '@nestjs/testing';
import { DataProducerService } from './data-producer.service';

describe('DataProducerService', () => {
  let service: DataProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataProducerService],
    }).compile();

    service = module.get<DataProducerService>(DataProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
