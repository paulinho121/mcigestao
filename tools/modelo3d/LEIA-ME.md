# Preparar modelo 3D para o AR

Pega o `.glb` bruto (de um gerador de 3D por IA, do fabricante ou de um escaneamento) e deixa pronto
para enviar em **Manutenção → Modelos 3D**:

1. **Escala real** — você informa uma medida do produto (cm) e o modelo inteiro é ajustado a ela.
   O AR mostra o produto exatamente nesse tamanho.
2. **Base no chão e centrado** — a origem fica no centro da base, como o AR espera.
3. **Enxuto** — remove duplicados, reduz texturas (padrão 2048 px), converte texturas WebP para PNG
   (mais compatível com o AR de celular) e, se pedido, reduz a quantidade de triângulos.

## Jeito fácil (Windows)
1. Dê duplo clique em `Preparar-Modelo-3D.bat` (ou arraste o `.glb` em cima dele).
   Na primeira vez ele instala os componentes sozinho (precisa de internet e do Node.js).
2. Diga qual medida você tem (altura, largura, profundidade ou a maior) e o valor em cm.
3. O arquivo pronto sai ao lado do original, com `-ar` no nome. Envie esse arquivo.

## Linha de comando
```
cd tools/modelo3d
npm install
node preparar-glb.mjs modelo.glb --altura 55
node preparar-glb.mjs modelo.glb --maior 62 --textura 1024 --triangulos 80000
node preparar-glb.mjs modelo.glb --so-relatorio     # só mostra medidas e tamanho
```

| Opção | O que faz |
|---|---|
| `--altura` `--largura` `--profundidade` `--maior` | **Uma** medida real do produto, em cm (eixos: altura = Y, largura = X, profundidade = Z) |
| `--saida arquivo.glb` | Nome do arquivo de saída (padrão: `<entrada>-ar.glb`) |
| `--textura 2048` | Lado máximo das texturas, em pixels |
| `--triangulos 80000` | Reduz a malha até esse total de triângulos |
| `--so-relatorio` | Não gera arquivo |

## Limites e cuidados
- Use as medidas **do produto**, não da caixa (as dimensões de frete do cadastro são da embalagem).
- O modelo deve estar com o "para cima" no eixo Y (padrão do glTF). Se ficar deitado, corrija no programa 3D.
- Se o modelo incluir tripé, suporte ou fundo, a medida informada vale para o conjunto todo. Recorte antes ou use
  a medida do conjunto.
- Arquivo final: até 25 MB (limite do envio) e, de preferência, abaixo de 200 mil triângulos para rodar bem no celular.
- O script não corrige formato errado nem partes faltando do modelo; ele só ajusta escala, posição e peso.
