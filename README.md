# OPTIMIZER PANEL

Aplicação real de monitoramento e otimização do sistema operacional, com:
- dashboard de CPU, RAM, disco, rede e processos reais
- backend local com API REST
- módulos de limpeza segura, inicialização, rede e performance
- logs estruturados, backup e rollback
- confirmação antes de operações potencialmente destrutivas

## Stack recomendado
- Electron
- Express
- SQLite local
- APIs nativas do sistema operacional

## Como executar

1. Instale dependências:
   npm install
2. Inicie a aplicação:
   npm start

## Observações de segurança
- A aplicação nunca executa comandos arbitrários vindos da interface.
- Operações destrutivas exigem confirmação.
- O painel só remove itens das categorias explícitas e seguras.
- Quando uma operação exige privilégio, ela é solicitada apenas no momento necessário.
