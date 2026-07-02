const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CONFIGURAÇÃO DE ACESSO (Múltiplos Gerentes)
const SENHAS_AUTORIZADAS = {
    "T3662707": "116289",
    "T3771233": "072026",
};

const dataDir = '/app/data';
const csvFilePath = path.join(dataDir, 'resultados.csv');

// Preparação silenciosa do arquivo
try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(csvFilePath)) fs.writeFileSync(csvFilePath, 'nome;pontuacao;total;data_hora\n');
} catch (err) {
    console.error("Erro ao preparar pasta de dados:", err);
}

// ROTA DE LOGIN (Atualizada para aceitar múltiplas senhas)
app.post('/api/login', (req, res) => {
    const { senha } = req.body;
    
    // Verifica se a senha enviada existe nos valores do nosso objeto de senhas
    const ehValido = Object.values(SENHAS_AUTORIZADAS).includes(senha);
    
    if (!ehValido) return res.status(401).json({ sucesso: false, mensagem: "Acesso negado" });
    res.json({ sucesso: true });
});

// ROTA DE SALVAR (Mantida conforme sua lógica)
app.post('/api/resultado', (req, res) => {
    const { nome, pontuacao, total, data_hora } = req.body;
    
    if (!nome || nome.trim().toLowerCase() === "modo teste") {
        return res.status(400).send("Modo Teste ou nome inválido");
    }
    
    try {
        fs.appendFileSync(csvFilePath, `"${nome}";${pontuacao};${total};"${data_hora}"\n`);
        res.json({ status: 'sucesso' });
    } catch (err) {
        res.status(500).json({ status: 'erro', mensagem: 'Falha ao salvar' });
    }
});

// ROTA DO DASHBOARD
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
        res.json([]); 
    }
});

// ROTA DE EXCLUSÃO (Atualizada para aceitar as novas senhas)
app.post('/api/remover', (req, res) => {
    const { index, senha } = req.body;
    
    // Verifica contra a lista de gerentes autorizados
    const ehAutorizado = Object.values(SENHAS_AUTORIZADAS).includes(senha);
    if (!ehAutorizado) return res.status(401).json({ sucesso: false });
    
    try {
        const content = fs.readFileSync(csvFilePath, 'utf8');
        const lines = content.trim().split('\n');
        
        if (index + 1 < lines.length) {
            lines.splice(index + 1, 1);
            fs.writeFileSync(csvFilePath, lines.join('\n') + '\n');
            res.json({ sucesso: true });
        } else {
            res.status(404).json({ sucesso: false });
        }
    } catch (e) { 
        res.status(500).json({ sucesso: false }); 
    }
});

app.get('/baixar-relatorio', (req, res) => res.download(csvFilePath, 'relatorio_bm.csv'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log("Servidor rodando na porta", PORT));
