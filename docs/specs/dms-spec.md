# Especificação - Document Management System

Esta especificação define o escopo funcional, os contratos e as decisões para
orientar a evolução do Document Management System (DMS). Nesta fase, os arquivos
dos documentos são armazenados no filesystem local e seus metadados permanecem
em memória.

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos usando uma
aplicação web com API Express e armazenamento local.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos documentos associados ao usuário informado na requisição.
- Download de um documento pelo identificador, limitado ao usuário informado.
- Exibição das operações de envio, listagem e download em uma interface React.
- Persistência dos arquivos no disco local da aplicação e dos metadados em memória.
- Tratamento de erros de validação, leitura e escrita de arquivos.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Persistência durável dos metadados ou recuperação deles após reinício.
- Autenticação, autorização robusta, cadastro de usuários ou gerenciamento de
  credenciais.
- Versionamento, edição, compartilhamento, exclusão ou busca avançada de
  documentos.
- Conversão, pré-visualização, antivírus ou classificação do conteúdo enviado.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | A API deve aceitar um arquivo no campo `file` de uma requisição multipart para envio de documento. |
| RF-02 | O sistema deve rejeitar o envio quando o arquivo estiver ausente ou exceder o limite configurado. |
| RF-03 | Para cada envio aceito, o sistema deve gerar um identificador único e registrar nome original, tamanho em bytes, data/hora de envio e dono. |
| RF-04 | O sistema deve associar o documento ao identificador de usuário recebido no cabeçalho `X-User-Id`. |
| RF-05 | O usuário deve poder listar somente os documentos associados ao identificador informado em `X-User-Id`. |
| RF-06 | A listagem deve apresentar os documentos do mais recente para o mais antigo. |
| RF-07 | O usuário deve poder baixar um documento pelo identificador quando o documento existir e pertencer ao identificador informado em `X-User-Id`. |
| RF-08 | O sistema deve responder como não encontrado tanto para identificador inexistente quanto para documento de outro usuário, sem revelar a existência de documentos alheios. |
| RF-09 | O frontend deve apresentar os estados de carregamento, sucesso e erro das operações de envio, listagem e download. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local usando `multer` com `diskStorage`; não devem ser usados provedores externos. |
| RNF-02 | O diretório de armazenamento deve ser configurável por variável de ambiente e, por padrão, corresponder a `backend/storage`. |
| RNF-03 | Os metadados devem ser mantidos em memória nesta fase. Uma reinicialização pode tornar os metadados inacessíveis mesmo que os arquivos continuem no disco. |
| RNF-04 | O tamanho máximo do arquivo deve ser configurável por variável de ambiente; o padrão inicial é 10 MiB. |
| RNF-05 | A porta e as demais configurações operacionais devem ser obtidas do ambiente, com valores padrão documentados quando aplicável. |
| RNF-06 | A API deve usar respostas JSON para erros e não deve expor caminhos absolutos ou nomes internos de armazenamento. |
| RNF-07 | O nome físico do arquivo deve ser gerado pelo servidor, sem confiar no nome enviado pelo usuário como caminho de destino. |
| RNF-08 | O sistema deve usar somente dependências já presentes no projeto nesta fase (`express` e `multer` no backend; React e `fetch` no frontend). |
| RNF-09 | O cabeçalho `X-User-Id` é um identificador fornecido pelo cliente, não uma credencial. Ele não oferece autenticação nem proteção contra falsificação e não deve ser considerado adequado para produção multiusuário. |

### Configuração prevista

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de gravação dos arquivos. |
| `MAX_UPLOAD_BYTES` | `10485760` | Limite de tamanho por arquivo, em bytes (10 MiB). |
| `MAX_STORAGE_BYTES` | `1073741824` | Limite total do armazenamento local, em bytes (1 GiB). |

Os valores padrão são relativos ao diretório raiz do backend/aplicação e devem
ser resolvidos de forma consistente, sem depender do diretório corrente de
execução. O diretório precisa existir ou ser criado pela aplicação e permitir
leitura e escrita pelo processo.

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, gerado pelo servidor; não contém caminho ou nome de arquivo. |
| `originalName` | string | Nome original fornecido no envio, usado para apresentação e nome sugerido no download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do envio em formato ISO 8601 UTC. |
| `owner` | string | Valor de `X-User-Id` associado ao documento. |

### Dado interno de persistência

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storageKey` | string | Nome interno gerado pelo servidor para localizar o arquivo dentro de `STORAGE_DIR`; nunca deve ser retornado pela API. |

Os metadados são armazenados em uma coleção em memória indexada por `id`. O
repositório é responsável por consultar e registrar metadados e resolver a chave
interna de armazenamento. O caminho absoluto deve ser montado a partir do
diretório configurado e da chave gerada pelo servidor, nunca a partir de
parâmetros da requisição.

Se a gravação do arquivo tiver sucesso, mas o registro dos metadados falhar, o
arquivo recém-gravado deve ser removido para evitar resíduo órfão. Na inicialização
após reinício, arquivos sem metadados não devem ser expostos por listagem ou
download; a aplicação não deve apagar automaticamente arquivos existentes.

## 6. Contratos de API

Os caminhos abaixo são os caminhos do backend. No desenvolvimento, o frontend
deve chamá-los com o prefixo `/api`; o proxy do Vite remove esse prefixo antes de
encaminhar a requisição para o backend. Todas as respostas de erro usam o
formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo 'file'."
  }
}
```

As mensagens são destinadas à interface e podem ser localizadas; o campo `code`
é o identificador estável para tratamento pelo cliente.

### `POST /upload`

- Cabeçalho obrigatório: `X-User-Id` com identificador não vazio.
- Corpo: `multipart/form-data`, contendo um arquivo único no campo `file`.
- Resposta `201 Created`:

```json
{
  "document": {
    "id": "<id-gerado>",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

- Erros: `400 USER_ID_REQUIRED` quando o cabeçalho estiver ausente ou vazio;
  `400 FILE_REQUIRED` quando o arquivo não for enviado; `413 FILE_TOO_LARGE`
  quando exceder `MAX_UPLOAD_BYTES`; `507 STORAGE_LIMIT_EXCEEDED` quando o total
  de arquivos armazenados exceder `MAX_STORAGE_BYTES`; `500 STORAGE_ERROR` para
  falhas de disco ou registro de metadados.
- Não se impõe lista de extensões ou tipos MIME nesta versão. O nome original é
  apenas metadado e deve ser tratado com segurança ao formar o cabeçalho de
  download.

### `GET /documents`

- Cabeçalho obrigatório: `X-User-Id`.
- Resposta `200 OK`, inclusive quando não houver documentos:

```json
{
  "documents": [
    {
      "id": "<id-gerado>",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-11-10T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

- A lista contém somente os documentos do usuário informado, ordenados por
  `uploadedAt` decrescente.
- Erros: `400 USER_ID_REQUIRED` quando o cabeçalho estiver ausente ou vazio;
  `500 INTERNAL_ERROR` para falhas inesperadas.

### `GET /documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id`.
- Resposta `200 OK`: bytes do arquivo, com `Content-Type` apropriado quando
  determinável e `Content-Disposition: attachment` contendo o nome original
  sanitizado.
- Erros: `400 USER_ID_REQUIRED` quando o cabeçalho estiver ausente ou vazio;
  `404 DOCUMENT_NOT_FOUND` se o documento não existir, não pertencer ao usuário
  ou se o arquivo correspondente não estiver disponível; `500 STORAGE_ERROR`
  para outras falhas de leitura.
- O identificador da rota deve ser tratado como dado opaco. Não se deve compor
  um caminho de arquivo diretamente com `:id`.

### Convenções de erro

- Erros de validação e de upload devem ser convertidos para o formato JSON
  definido acima, sem resposta HTML padrão do Express ou do Multer.
- O backend deve registrar detalhes operacionais necessários para diagnóstico,
  sem incluir conteúdo de arquivo ou expor caminhos locais ao cliente.
- Erros inesperados devem retornar `500 INTERNAL_ERROR`, exceto falhas de
  armazenamento identificáveis, que retornam `500 STORAGE_ERROR`.

## 7. Decisões arquiteturais

### Backend

O backend usa Node.js, Express e CommonJS, com dependências direcionadas para o
interior da aplicação:

`routes -> controllers -> services -> repositories`

- **Routes:** declaram os caminhos HTTP, conectam o middleware de upload e
  delegam aos controllers.
- **Controllers:** validam os dados de entrada no limite HTTP, extraem arquivo e
  cabeçalho, chamam os services e traduzem resultados/erros para status e
  respostas HTTP.
- **Services:** aplicam as regras de negócio, incluindo associação ao dono,
  consultas restritas por usuário e tratamento do fluxo de persistência.
- **Repositories:** isolam a coleção de metadados em memória e o acesso ao
  filesystem local; não conhecem Express nem objetos de requisição/resposta.
- **Multer:** usa `diskStorage` com diretório configurado e nome físico gerado
  pelo servidor. O nome enviado pelo cliente não determina o caminho gravado.

As rotas existentes, como `/health`, devem continuar disponíveis. Nenhuma camada
interna deve depender de camadas externas.

### Frontend

- Aplicação React com componentes funcionais e Hooks.
- Acesso à API centralizado em serviços que usam `fetch` e o prefixo `/api`.
- A interface deve permitir informar o identificador simples do usuário desta
  fase, enviar arquivos, atualizar a listagem e iniciar downloads.
- A interface deve distinguir lista vazia de erro e apresentar falhas de tamanho,
  envio e download de forma compreensível.

### Armazenamento e identidade

- Arquivos apenas no disco local da aplicação; metadados apenas em memória.
- Não há persistência durável nem identidade autenticada. `X-User-Id` existe
  para particionamento funcional simples e não constitui uma barreira de
  segurança.
- O caminho de armazenamento e o nome físico não são dados públicos da API.

## 8. Plano de execução

As etapas abaixo descrevem o desenvolvimento futuro em nível funcional. Esta
entrega consiste somente nesta especificação; não inclui execução ou alteração
de arquivos de backend ou frontend.

1. Estabelecer configuração por ambiente, criação/validação do diretório local e
   armazenamento de arquivos com `multer` e `diskStorage`.
2. Implementar repositório de metadados em memória e regras de envio, geração de
   identificador, associação ao dono e limpeza do arquivo em falha de registro.
3. Implementar e testar os contratos HTTP de envio, listagem por usuário e
   download, incluindo validações, erros e proteção contra acesso por outro
   identificador.
4. Desenvolver a interface React para identificação simples do usuário, envio,
   listagem, estados de carregamento/erro e download, consumindo a API pelo
   prefixo `/api`.
5. Validar o fluxo integrado, os limites e erros de armazenamento, a persistência
   esperada entre requisições e a perda de metadados após reinicialização.
6. Documentar limitações operacionais e confirmar que nenhuma dependência ou
   serviço externo de armazenamento foi introduzido.