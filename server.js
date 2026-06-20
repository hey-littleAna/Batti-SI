const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SENHA_MESTRA = "116289";
const dataDir = '/app/data';
const csvFilePath = path.join(dataDir, 'resultados.csv');

// Tente criar o arquivo de forma silenciosa
try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(csvFilePath)) fs.writeFileSync(csvFilePath, 'nome;pontuacao;total;data_hora\n');
} catch (err) {
    console.error("Erro ao preparar a pasta de dados (isso pode ser permissão):", err);
}

// ROTA DE LOGIN
app.post('/api/login', (req, res) => {
    const { senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ sucesso: false });
    res.json({ sucesso: true });
});

// ROTA DE SALVAR (Executada apenas se o index.html permitir)
app.post('/api/resultado', (req, res) => {
    const { nome, pontuacao, total, data_hora } = req.body;
    
    // LINHA NOVA: Verifica se o nome é "Modo Teste" (ignorando maiúsculas/minúsculas)
    if (!nome || nome.trim().toLowerCase() === "modo teste") {
        return res.status(400).send("Nome inválido");
    }
    
    fs.appendFileSync(csvFilePath, `"${nome}";${pontuacao};${total};"${data_hora}"\n`);
    res.json({ status: 'sucesso' });
});

// ROTA DO DASHBOARD (Lê o arquivo direto)
app.get('/api/dados-dashboard', (req, res) => {
    try {
        const content = fs.readFileSync(csvFilePath, 'utf8');
        const lines = content.trim().split('\n').slice(1); // Pula cabeçalho
        const dados = lines.map((line, i) => {
            const c = line.split(';');
            return { 
                index: i, 
                nome: c[0].replace(/"/g, ''), 
                pontuacao: parseInt(c[1]), 
                total: parseInt(c[2]), 
                data_hora: c[3].replace(/"/g, '') 
            };
        });
        res.json(dados);
    } catch (e) { res.json([]); }
});

// ROTA DE EXCLUSÃO (Protegida por senha)
app.post('/api/remover', (req, res) => {
    const { index, senha } = req.body;
    if (senha !== SENHA_MESTRA) return res.status(401).json({ sucesso: false });
    
    try {
        const lines = fs.readFileSync(csvFilePath, 'utf8').trim().split('\n');
        lines.splice(index + 1, 1);
        fs.writeFileSync(csvFilePath, lines.join('\n') + '\n');
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ sucesso: false }); }
});

app.get('/baixar-relatorio', (req, res) => res.download(csvFilePath, 'relatorio_bm.csv'));
        const PORT = process.env.PORT || 3000;

// Adicione esta rota simples para o Easypanel checar se o servidor está vivo
app.get('/health', (req, res) => res.status(200).send('OK'));

// E garanta que o listen aceite conexões externas
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));
