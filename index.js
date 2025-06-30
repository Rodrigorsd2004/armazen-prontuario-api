const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "https://prontuariosemef.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Responde preflight para todas rotas
app.use(express.json());

const prisma = new PrismaClient();

// Rota de teste
app.get("/", (req, res) => {
  res.send("API Prontuário Escolar funcionando");
});

// ROTA PARA GERAR EXCEL A PARTIR DE UM MODELO
app.post("/gerar-excel", async (req, res) => {
  const dados = req.body;
  const workbook = new ExcelJS.Workbook();
  const modeloPath = path.join(__dirname, "assets", "modelo-prontuario.xlsx");

  try {
    const buffer = fs.readFileSync(modeloPath);
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet(1);
    const set = (celula, valor) => {
      const cell = sheet.getCell(celula);
      const estiloOriginal = { ...cell.style };
      cell.value = valor;
      cell.style = estiloOriginal;
    };

    // Mapeamento com base no seu modelo real
    set("B11", dados.escola);
    set("J11", dados.codigoCIE);
    set("B13", dados.ra);
    set("F13", dados.cpf);
    set("J13", dados.rg);
    set("B15", dados.rm);
    set("F15", dados.sexo);
    set("J15", dados.orgaoExpedidor);
    set("C17", dados.nome);
    set("B20", dados.nis);
    set("F21", dados.bolsaFamilia === "sim" ? "X" : "");
    set("F22", dados.bolsaFamilia === "não" ? "X" : "");
    set("I20", dados.corRaca);
    set("E24", dados.necessidadesEspeciais === "sim" ? "X" : "");
    set("F24", dados.necessidadesEspeciais === "não" ? "X" : "");
    set("C28", dados.municipio);
    set("C29", dados.nacionalidade);
    set("H29", dados.ufNascimento);

    if (dados.dataNascimento) {
      const data = new Date(dados.dataNascimento);
      const dia = String(data.getDate()).padStart(2, "0");
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const ano = data.getFullYear().toString();

      set("J29", dia);
      set("K29", mes);
      set("L29", ano);
    }

    set("C31", dados.nomePai);
    set("C34", dados.nomeMae);

    set("O18", dados.enderecoRua);
    set("U18", dados.enderecoNumero);
    set("O20", dados.enderecoBairro);
    set("O21", dados.enderecoCidade);
    set("V20", dados.enderecoUF);
    set("V21", dados.enderecoCEP);

    set("Q25", dados.telefone1);
    set("Q26", dados.telefone2);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=prontuario.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    res.status(500).send("Erro ao gerar Excel");
  }
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

// Editar um aluno
app.put("/alunos/:id", async (req, res) => {
  console.log("Dados recebidos:", req.body);
  const { id } = req.params;
  const data = req.body;

  try {
    const alunoExiste = await prisma.aluno.findUnique({
      where: { id: parseInt(id) },
    });

    if (!alunoExiste) {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }

    if (!data.dataNascimento || data.dataNascimento.trim() === "") {
      delete data.dataNascimento;
    } else {
      data.dataNascimento = new Date(data.dataNascimento);
    }

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
      orderBy: { id: "asc" },
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

// Login simples
app.post("/login", (req, res) => {
  const { prontuario, senha } = req.body;

  const loginCorreto = process.env.LOGIN_USER;
  const senhaCorreta = process.env.LOGIN_PASSWORD;

  if (prontuario === loginCorreto && senha === senhaCorreta) {
    return res.status(200).json({ mensagem: "Login autorizado" });
  } else {
    return res.status(401).json({ erro: "Prontuário ou senha incorretos" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
