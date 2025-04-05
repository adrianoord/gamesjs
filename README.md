#  Multiplayer Game

Projeto para criar jogos com Node.js, Express e Socket.IO.

## Tecnologias Utilizadas

- **Node.js** - Ambiente de execução JavaScript
- **Express** - Framework web para Node.js
- **Socket.IO** - Biblioteca para comunicação em tempo real
- **TypeScript** - Superset tipado de JavaScript

## Funcionalidades

- Criação e gerenciamento de salas de jogo
- Suporte para até 4 jogadores por sala
- Sistema de cores para diferenciar os jogadores
- Detecção de colisão
- Sistema de vidas e invulnerabilidade temporária
- Controle do estado do jogo (iniciar, reiniciar, pausar)

## Como Executar

1. Certifique-se de ter o Node.js instalado
2. Clone o repositório
3. Instale as dependências:
   ```
   npm install
   ```
4. Compile o TypeScript:
   ```
   npm run build
   ```
5. Inicie o servidor:
   ```
   npm start
   ```
6. Acesse o jogo em um navegador: http://localhost:3000

## Estrutura do Projeto

- `main.ts` - Ponto de entrada da aplicação, configuração do servidor e lógica de comunicação Socket.IO
- `game.ts` - Classe principal do jogo, contendo a lógica do jogo
- `public/` - Arquivos estáticos (HTML, CSS, JavaScript do cliente)

## Comandos de Jogo

- Crie uma sala inserindo um ID único
- Entre em uma sala existente escolhendo uma cor disponível
- Use as teclas direcionais para mover seu personagem
- Evite colisões com outros jogadores e obstáculos

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.