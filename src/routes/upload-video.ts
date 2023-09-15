import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path"; // importando o path de dentro do node
import { randomUUID } from "node:crypto"; // importamos o ramdom UUID para criar ids aleatorios
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 50, //25mb
    },
  });

  app.post("/videos", async (request, reply) => {
    const data = await request.file(); // pegando o arquivo enviado

    if (!data) {
      // verificando se o arquivo foi enviado
      return reply.status(400).send({ error: "Missing file input." }); // Retornando um erro atraves do reply
    }

    const extension = path.extname(data.filename); // retorna a extensao do arquivo enviado

    if (extension !== ".mp3") {
      return reply
        .status(400)
        .send({ error: "Invalid input type, please upload a MP3." }); // Retornando um erro atraves do reply
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`; // Criando um novo nome para o arquivo
    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    ); // definindo o diretorio que sera salvo os arquivos

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return { video };
  });
}
