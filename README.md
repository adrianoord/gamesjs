#  Multiplayer Game

Projeto para criar jogos com Node.js, Express e Socket.IO.

## Tecnologias Utilizadas

- **Node.js** - Ambiente de execução JavaScript
- **Express** - Framework web para Node.js
- **Socket.IO** - Biblioteca para comunicação em tempo real
- **TypeScript** - Superset tipado de JavaScript

## Funcionalidades

- Criação e gerenciamento de salas de jogo
- Suporte pelo menos até 6 jogadores por sala
- Sistema de cores para diferenciar os jogadores
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
5.1 Ou inicie o servidor com ts-node:
   ```
   ts-node main.ts
   ```

6. Acesse o jogo em um navegador: http://localhost:3333

## Estrutura do Projeto

- `main.ts` - Ponto de entrada da aplicação, configuração do servidor e criação dos namespaces de comunicação Socket.IO
- `games/` - Pastas dos jogos, contendo o serviço e regras do jogo Ex:
 `games/kart`
     `kart.rules.ts`
     `kart.service.ts`
- `public/` - Arquivos estáticos (HTML, CSS, JavaScript do cliente)

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.
