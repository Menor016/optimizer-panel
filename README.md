# OPTIMIZER PANEL

Aplicativo desktop local de monitoramento e otimização do sistema operacional.

## Visão geral

O OPTIMIZER PANEL foi desenvolvido como um aplicativo real, funcional e local, com arquitetura organizada em:

- Frontend: interface do painel
- Backend local: execução de operações do sistema
- Módulos de monitoramento e otimização
- Camada de permissões
- Sistema de logs estruturados
- Banco local para histórico e preferências

O painel acessa dados reais do sistema operacional e nunca inventa indicadores quando a informação não existe. Quando uma métrica não está disponível, ela aparece como "Não disponível".

## Segurança e requisitos

- A aplicação não executa comandos arbitrários vindos da interface.
- Operações destrutivas exigem confirmação explícita.
- Processos críticos do sistema são protegidos.
- Somente categorias seguras e explicitamente selecionadas podem ser limpas.
- Operações que exigem privilégios solicitam elevação somente no momento necessário.

## Tecnologias

- Electron
- Express
- SQLite local
- APIs nativas do sistema operacional

## Requisitos do sistema

- Node.js 18+
- npm
- Windows 10/11 (para a build do instalador Windows)

## Instalação da aplicação

1. Abra o PowerShell ou CMD na pasta do projeto.
2. Execute:

   npm install

3. Inicie em modo de desenvolvimento:

   npm start

## Geração do instalador Windows

No ambiente Windows, execute:

   npm run pack:win

O artefato será gerado na pasta:

   dist\

Você deve encontrar um instalador .exe do tipo:

- Optimizer Panel-1.0.0-win-x64.exe

## Validação pós-instalação

Após instalar o aplicativo, valide os itens abaixo:

### Monitoramento
- CPU total
- CPU por núcleo
- RAM total/utilizada/disponível
- Disco e espaço livre
- Rede ativa
- Tempo de atividade do sistema
- GPU, quando suportada
- Temperaturas e sensores, quando disponíveis

### Processos
- Lista real de processos
- Pesquisa por processo
- Ordenação por CPU e RAM
- Encerramento com confirmação
- Bloqueio de processos críticos do sistema

### Limpeza segura
- Análise antes da limpeza
- Só habilita a limpeza depois da análise
- Somente categorias seguras são aceitas
- Confirmação antes da remoção
- Tratamento de permissões e acessos bloqueados

### Inicialização
- Lista de itens de inicialização
- Estado atual
- Ativar/desativar com confirmação
- Registro no histórico

### Rede
- Interface ativa
- IP local
- Velocidade, quando disponível
- Testes de conectividade, DNS e latência

### Performance e histórico
- Histórico em períodos configuráveis
- Limite de armazenamento local
- Logs estruturados

## Segurança da execução

- Nenhum comando é montado concatenando entrada livre da interface.
- Apenas ações pré-definidas são executadas.
- Validação de entrada e controle de permissões foram implementados.
- Timeout, tratamento de exceções e cancelamento de operações demoram são previstos.

## Estrutura principal

- app/ — backend e módulos do sistema
- public/ — interface do painel
- dist/ — artefatos de build para distribuição

## Observações finais

A aplicação foi projetada para funcionar como um utilitário local e seguro para monitoramento e otimização do sistema operacional.

A geração do instalador final exige execução em ambiente Windows nativo, pois o Electron Builder produz artefatos específicos da plataforma alvo.

## Licença

MIT
