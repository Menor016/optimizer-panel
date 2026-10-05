# OPTIMIZER PANEL

Aplicativo desktop local para monitoramento e otimização do sistema operacional.

## Requisitos

- Node.js 18+
- npm
- Ambiente nativo do sistema operacional em que o app será executado

## Instalação

1. Clone o repositório
2. Entre na pasta do projeto
3. Instale as dependências:

   npm install

4. Inicie a aplicação:

   npm start

## Build para distribuição

Para gerar os instaladores executáveis do aplicativo:

- Windows:
  npm run pack:win

- Linux:
  npm run pack:linux

- macOS:
  npm run pack:mac

Os artefatos serão gerados na pasta dist/.

## Observações importantes

- O app foi projetado para rodar localmente e acessar dados reais do sistema.
- Operações de limpeza, encerramento de processos e alteração de inicialização exigem confirmação.
- Não são executados comandos arbitrários vindos da interface.
- Quando uma operação exige privilégios, a aplicação solicita somente o necessário.

## Estrutura principal

- app/: backend, adaptadores do sistema e lógica da aplicação
- public/: frontend e interface do painel
- dist/: artefatos gerados pelo empacotamento
