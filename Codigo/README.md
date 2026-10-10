# Código do GuiaCampus

O projeto contém uma aplicação web de monitoramento e o firmware do protótipo ESP32, que se comunicam por Bluetooth Low Energy (BLE).

## Estrutura

```text
Codigo/
├── README.md              # Guia de entrada do código
├── web/                   # Aplicação Next.js / React / TypeScript
│   ├── src/app/           # Páginas, layout e estilos
│   ├── src/components/    # Dashboard e componentes de interface
│   ├── src/hooks/         # Coleta e gerenciamento da telemetria
│   ├── src/lib/           # Protocolo BLE, validação e utilitários
│   ├── tests/             # Testes automatizados com Vitest
│   ├── package.json       # Dependências e comandos da aplicação
│   └── README.md          # Operação, protocolo BLE e diagnóstico
└── esp32/
    ├── README.md          # Preparação e gravação do firmware
    └── guiacampus/        # Pasta do sketch (mesmo nome do .ino)
        ├── guiacampus.ino # Sketch Arduino do ESP32
        └── imu_orientation.h
```

## Executar a aplicação web

Requisitos: Node.js 22.12+ e npm. A partir da raiz do repositório:

```bash
cd Codigo/web
npm ci
npm run dev
```

Abra <http://localhost:3000>. O modo **Demonstração** permite usar a aplicação sem o ESP32. Nenhuma variável de ambiente é necessária.

Na mesma pasta, execute as verificações e a build de produção:

```bash
npm test
npm run build
npm run typecheck
npm start
```

A build gera os tipos de rotas do Next.js usados na checagem TypeScript. `npm start` serve a build de produção; para desenvolvimento, use `npm run dev`.

A aplicação usa Tailwind CSS, Radix/shadcn/ui, Recharts, Lucide e Zod. Consulte o [guia da aplicação](web/README.md) para conexão BLE, formato dos dados, limitações e calibração da IMU.

## Firmware

O firmware é escrito em C++ para Arduino/ESP32. Consulte o [guia do ESP32](esp32/README.md) para dependências, pinagem e gravação.

## Convenções

- Código, testes e configurações da aplicação ficam em `web/`.
- Código e instruções do dispositivo ficam em `esp32/`.
- Mantenha `web/package-lock.json` versionado para instalações reproduzíveis.
- Dependências locais, builds, caches e arquivos de ambiente são ignorados pelo Git.
