import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'

import { AwsController } from './aws.controller'

describe('AwsController', () => {
  let controller: AwsController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AwsController],
    }).compile()

    controller = module.get<AwsController>(AwsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
