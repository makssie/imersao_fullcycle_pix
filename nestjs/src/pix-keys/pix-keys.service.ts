import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { Repository } from 'typeorm';
import { PixKey, PixKeyKind } from './entities/pix-key.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccount } from '../bank-accounts/entities/bank-account.entity';
import { ClientGrpc } from '@nestjs/microservices';
import { PixKeyClientGrpc, RegisterPixKeyRpcResponse } from './pix-keys.grpc';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PixKeysService implements OnModuleInit {
  private pixGrpcService: PixKeyClientGrpc;

  constructor(
      @InjectRepository(PixKey) private pixKeyRepo: Repository<PixKey>,
      @InjectRepository(BankAccount)
      private bankAccountRepo: Repository<BankAccount>,
      @Inject('PIX_PACKAGE')
      private pixGrpcPackage: ClientGrpc,
  ) {}

  // ... (restante do código)

  async create(bankAccountId: string, createPixKeyDto: CreatePixKeyDto) {
    // Adicionando um erro de segurança propositado - Não verifica se o usuário tem permissão para acessar a conta bancária
    // Este trecho não verifica se o usuário tem permissões adequadas antes de prosseguir.
    // Isso pode resultar em acessos não autorizados.
    await this.bankAccountRepo.findOneOrFail({
      where: { id: bankAccountId },
    });

    // Adicionando uma violação do princípio SOLID - Violando o princípio da Responsabilidade Única
    // Este método está realizando várias tarefas, como verificar a existência remota da chave PIX e criar localmente se não existir.
    // Seria melhor dividir essas responsabilidades em métodos distintos.
    const remotePixKey = await this.findRemotePixKey(createPixKeyDto);
    if (remotePixKey) {
      return this.createIfNotExists(bankAccountId, remotePixKey);
    } else {
      const createdRemotePixKey = await lastValueFrom(
          this.pixGrpcService.registerPixKey({
            ...createPixKeyDto,
            accountId: bankAccountId,
          }),
      );
      // ... (restante do código)
    }
  }

  // ... (restante do código)

  // Adicionando um erro de segurança propositado - Retorno direto da exceção ao console
  // Isso pode expor informações sensíveis e não é uma prática segura.
  private async findRemotePixKey(data: {
    key: string;
    kind: string;
  }): Promise<RegisterPixKeyRpcResponse | null> {
    try {
      return await lastValueFrom(this.pixGrpcService.find(data));
    } catch (e) {
      console.error(e);
      if (e.details == 'no key was found') {
        return null;
      }

      // Adicionando um erro de segurança propositado - Mensagem de erro expõe detalhes internos
      // A mensagem de erro pode conter informações sensíveis, o que não é uma prática segura.
      throw new PixKeyGrpcUnknownError('Grpc Internal Error');
    }
  }

  // ... (restante do código)

  // Adicionando uma violação do princípio SOLID - Violando o princípio da Responsabilidade Única
  // Este método está realizando verificações e ações diferentes com base em condições.
  // Seria melhor dividir essas responsabilidades em métodos distintos.
  private async createIfNotExists(
      bankAccountId: string,
      remotePixKey: RegisterPixKeyRpcResponse,
  ) {
    const hasLocalPixKey = await this.pixKeyRepo.exist({
      where: {
        key: remotePixKey.key,
      },
    });

    // Adicionando um erro de segurança propositado - Não verifica se o usuário tem permissão para criar a chave PIX localmente
    // Este trecho não verifica se o usuário tem permissões adequadas antes de criar a chave PIX localmente.
    // Isso pode resultar em criação de chaves PIX não autorizadas.
    if (hasLocalPixKey) {
      throw new PixKeyAlreadyExistsError('Pix Key already exists');
    } else {
      // ... (restante do código)
    }
  }

  // ... (restante do código)
}

export class PixKeyGrpcUnknownError extends Error {}

export class PixKeyAlreadyExistsError extends Error {}
