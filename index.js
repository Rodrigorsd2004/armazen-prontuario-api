const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");

const app = express(); // Primeiro criar o app

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://armazen-prontuario-api-production.up.railway.app",
      "https://prontuariosemef.vercel.app" // (coloque aqui depois o domínio final da Vercel)
    ],
  })
);

app.use(express.json());

const prisma = new PrismaClient();

// Rotas

// Rota de teste
app.get("/", (req, res) => {
  res.send("API Prontuário Escolar funcionando");
});

// Criar um aluno
app.post("/alunos", async (req, res) => {
  const data = req.body;

  data.escola = "Profª Ernestina Nogueira César";
  data.codigoCIE = "240825";
  if (data.dataNascimento) {
    data.dataNascimento = new Date(data.dataNascimento);
  }

  try {
    const aluno = await prisma.aluno.create({ data });
    res.status(201).json(aluno);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar aluno" });
  }
});

//Editar um aluno
app.put("/alunos/:id", async (req, res) => {
  console.log("Dados recebidos:", req.body);
  const { id } = req.params;
  const data = req.body;

  try {
    // Verifica se o aluno existe
    const alunoExiste = await prisma.aluno.findUnique({
      where: { id: parseInt(id) },
    });

    if (!alunoExiste) {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }

    // Corrigir o campo dataNascimento se estiver vazio
    if (!data.dataNascimento || data.dataNascimento.trim() === "") {
      delete data.dataNascimento;
    } else {
      data.dataNascimento = new Date(data.dataNascimento);
    }


    // Atualiza o aluno
    const alunoAtualizado = await prisma.aluno.update({
      where: { id: parseInt(id) },
      data,
    });

    res.json(alunoAtualizado);

  } catch (error) {
    console.error("Erro ao atualizar aluno:", error);
    res.status(500).json({ error: "Erro interno ao atualizar aluno" });
  }
});


// Deletar um aluno
app.delete("/alunos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.aluno.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Aluno deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar aluno" });
  }
});



// Listar todos os alunos
app.get("/alunos", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      orderBy: { id: 'asc' }
    });

    res.json(alunos);
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
});


// Buscar aluno por ID
app.get("/alunos/:id", async (req, res) => {
  const { id } = req.params;
  const aluno = await prisma.aluno.findUnique({
    where: { id: parseInt(id) },
  });

  if (!aluno) {
    return res.status(404).json({ error: "Aluno não encontrado" });
  }

  res.json(aluno);
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});