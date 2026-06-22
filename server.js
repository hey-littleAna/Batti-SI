const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SENHA_MESTRA = "116289";
const dataDir = '/app/data';
const csvFilePath = path.join(dataDir, 'resultados.csv');

// Preparação silenciosa do arquivo
try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(csvFilePath)) fs.writeFileSync(csvFilePath, 'nome;pontuacao;total;data_hora\n');
} catch (err) {
    console.error("Erro ao preparar pasta de dados:", err);
}

// ROTA DE LOGIN
app.post('/api/login', (req, res) => {
    const { senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ sucesso: false });
    res.json({ sucesso: true });
});

// ROTA DE SALVAR (Com filtro robusto de Modo Teste)
app.post('/api/resultado', (req, res) => {
    const { nome, pontuacao, total, data_hora } = req.body;
    
    // Verifica se nome é nulo ou se é "Modo Teste"
    if (!nome || nome.trim().toLowerCase() === "modo teste") {
        console.log("Tentativa de salvar dado em Modo Teste ignorada.");
        return res.status(400).send("Nome inválido ou Modo Teste");
    }
    
    try {
        fs.appendFileSync(csvFilePath, `"${nome}";${pontuacao};${total};"${data_hora}"\n`);
        res.json({ status: 'sucesso' });
    } catch (err) {
        res.status(500).json({ status: 'erro', mensagem: 'Falha ao salvar' });
    }
});

// ROTA DO DASHBOARD (Lê o arquivo e retorna lista limpa)
app.get('/api/dados-dashboard', (req, res) => {
    try {
        if (!fs.existsSync(csvFilePath)) return res.json([]);
        const content = fs.readFileSync(csvFilePath, 'utf8');
        const lines = content.trim().split('\n').slice(1);
        
        const dados = lines.map((line, i) => {
            const c = line.split(';');
            return { 
                index: i, 
                nome: c[0] ? c[0].replace(/"/g, '') : "Desconhecido", 
                pontuacao: parseInt(c[1]) || 0, 
                total: parseInt(c[2]) || 0, 
                data_hora: c[3] ? c[3].replace(/"/g, '') : "" 
            };
        });
        res.json(dados);
    } catch (e) { 
        console.error("Erro na leitura do dashboard:", e);
        res.json([]); 
    }
});

// ROTA DE EXCLUSÃO (Protegida)
app.post('/api/remover', (req, res) => {
    const { index, senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ sucesso: false });
    
    try {
        const content = fs.readFileSync(csvFilePath, 'utf8');
        const lines = content.trim().split('\n');
        
        // Verifica se o índice existe (considerando que a linha 0 é cabeçalho)
        if (index + 1 < lines.length) {
            lines.splice(index + 1, 1);
            fs.writeFileSync(csvFilePath, lines.join('\n') + '\n');
            res.json({ sucesso: true });
        } else {
            res.status(404).json({ sucesso: false, mensagem: "Índice não encontrado" });
        }
    } catch (e) { 
        console.error("Erro na exclusão:", e);
        res.status(500).json({ sucesso: false }); 
    }
});

app.get('/baixar-relatorio', (req, res) => res.download(csvFilePath, 'relatorio_bm.csv'));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log("Servidor rodando na porta", PORT);
});

server.on('error', (err) => console.error("ERRO FATAL:", err));
