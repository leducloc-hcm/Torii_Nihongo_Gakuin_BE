import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ModuleRepository } from './module.repo'
import { CreateModuleDTO, UpdateModuleDTO, QueryModuleDTO } from './module.dto'
import { ModuleWithRelations, ModuleWhereInput, ModuleOrderByInput } from './module.model'

@Injectable()
export class ModuleService {
  constructor(private readonly moduleRepository: ModuleRepository) {}

  async create(createModuleDto: CreateModuleDTO): Promise<ModuleWithRelations> {
    const { courseId, title, order } = createModuleDto

    // Check if course exists
    const courseExists = await this.moduleRepository.checkCourseExists(courseId)
    if (!courseExists) {
      throw new BadRequestException(`Course with ID ${courseId} does not exist`)
    }

    // If no order is provided, set it to the next available order
    let moduleOrder = order
    if (moduleOrder === undefined) {
      const maxOrder = await this.moduleRepository.getMaxOrder(courseId)
      moduleOrder = maxOrder + 1
    }

    return this.moduleRepository.create({
      courseId,
      title,
      order: moduleOrder,
    })
  }

  async findAll() {
    // Build where clause

    const { modules, total } = await this.moduleRepository.findAll()

    return {
      data: modules,
    }
  }

  async findOne(id: number): Promise<ModuleWithRelations> {
    const module = await this.moduleRepository.findOne({ id })

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`)
    }

    return module
  }

  async update(id: number, updateModuleDto: UpdateModuleDTO): Promise<ModuleWithRelations> {
    // Check if module exists
    await this.findOne(id)

    return this.moduleRepository.update({
      where: { id },
      data: updateModuleDto,
    })
  }

  async remove(id: number): Promise<ModuleWithRelations> {
    // Check if module exists
    const module = await this.findOne(id)

    // Delete the module (cascade will handle related entities)
    await this.moduleRepository.delete({ id })

    return module
  }
}
