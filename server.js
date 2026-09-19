import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const mongoURI = "mongodb+srv://kaua:Kaua4595@kauaalbuquerquedosanjos.myryjlm.mongodb.net/techshop?retryWrites=true&w=majority&appName=KauaAlbuquerquedosAnjos";

// CORREÇÃO PROTOCOLO VERCEL: Garante conexão ativa e estável em ambiente Serverless
let conectado = false;
async function conectarBanco() {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(mongoURI, {
      bufferCommands: false,
    });
    console.log("Conectado ao MongoDB Atlas com sucesso!");
    
    // Só popula se for a primeira inicialização absoluta
    if (!conectado) {
      await popularBancoDeDados();
      conectado = true;
    }
  } catch (err) {
    console.error("Erro ao conectar ao MongoDB:", err);
    throw err;
  }
}

// Middleware obrigatório na Vercel para conectar antes de responder às rotas
app.use(async (req, res, next) => {
  try {
    await conectarBanco();
    next();
  } catch (error) {
    res.status(500).json({ erro: "Erro ao conectar ao banco de dados" });
  }
});

// Schemas e Models
const produtoSchema = new mongoose.Schema({ 
  id_produto: Number, 
  nome_produto: String, 
  estoque: Number, 
  preco: Number, 
  categoria: String 
});

// Evita erro de OverwriteModelError comum na Vercel ao recarregar arquivos
const Produto = mongoose.models.Produto || mongoose.model('Produto', produtoSchema);

const clienteSchema = new mongoose.Schema({ 
  id_cliente: Number, 
  nome: String, 
  email: String, 
  telefone: String 
});

const Cliente = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema);

const itemPedidoSchema = new mongoose.Schema({ 
  id_produto: Number, 
  quantidade: Number, 
  preco_unitario: Number 
});

const pedidoSchema = new mongoose.Schema({ 
  id_pedido: Number, 
  id_cliente: Number, 
  status_pedido: String, 
  itens: [itemPedidoSchema] 
});

const Pedido = mongoose.models.Pedido || mongoose.model('Pedido', pedidoSchema);

// Função automática para preencher o MongoDB otimizada para Serverless
async function popularBancoDeDados() {
  try {
    const totalProdutos = await Produto.countDocuments();
    if (totalProdutos === 0) {
      console.log("Banco vazio! Inserindo dados de teste...");
      await Produto.insertMany([
        { id_produto: 1, nome_produto: "Mouse Gamer", estoque: 15, preco: 150, categoria: "Periféricos" },
        { id_produto: 2, nome_produto: "Teclado Mecânico", estoque: 8, preco: 350, categoria: "Periféricos" },
        { id_produto: 3, nome_produto: "Monitor 24'", estoque: 5, preco: 899, categoria: "Monitores" }
      ]);
    }

    const totalPedidos = await Pedido.countDocuments();
    if (totalPedidos === 0) {
      console.log("Sincronizando tabela para conter exatamente 4 vendas...");
      await Pedido.insertMany([
        { id_pedido: 100, id_cliente: 10, status_pedido: "Entregue", itens: [{ id_produto: 1, quantidade: 2, preco_unitario: 150 }] },
        { id_pedido: 101, id_cliente: 11, status_pedido: "Pendente", itens: [{ id_produto: 2, quantidade: 1, preco_unitario: 350 }] },
        { id_pedido: 102, id_cliente: 12, status_pedido: "Entregue", itens: [{ id_produto: 1, quantidade: 1, preco_unitario: 150 }] },
        { id_pedido: 103, id_cliente: 15, status_pedido: "Pendente", itens: [{ id_produto: 2, quantidade: 1, preco_unitario: 350 }] }
      ]);
      console.log("4 compras cadastradas com sucesso no MongoDB Atlas!");
    }
  } catch (error) {
    console.error("Erro ao popular o banco:", error);
  }
}

// Middlewares adicionais
app.use(express.json());
app.use(express.static(__dirname));

// Rota raiz para carregar o front-end na URL principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para retornar todos os clientes cadastrados no banco NoSQL
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find({});
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rotas da API
app.get('/api/relatorio-vendas', async (req, res) => {
  try {
    const pedidos = await Pedido.find({});
    const clientes = await Cliente.find({});
    
    const relatorio = pedidos.map(pedido => {
      const cliente = clientes.find(c => c.id_cliente === pedido.id_cliente);
      const totalPedido = pedido.itens.reduce(
        (acc, item) => acc + (item.quantidade * item.preco_unitario), 
        0
      );
      
      return {
        id_pedido: pedido.id_pedido,
        nome_cliente: cliente ? cliente.nome : 'Cliente Removido/Inexistente',
        total_pedido: totalPedido,
        status_pedido: pedido.status_pedido
      };
    });

    res.json(relatorio);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.get('/api/estoque', async (req, res) => {
  try {
    const produtos = await Produto.find({});
    const pedidos = await Pedido.find({});

    const estoqueComVendas = produtos.map(prod => {
      let totalVendido = 0;

      pedidos.forEach(ped => {
        ped.itens.forEach(item => {
          if (Number(item.id_produto) === Number(prod.id_produto)) {
            totalVendido += item.quantidade;
          }
        });
      });

      return {
        id_produto: prod.id_produto,
        nome_produto: prod.nome_produto,
        estoque_atual: prod.estoque,
        total_unidades_vendidas: totalVendido
      };
    });

    res.json(estoqueComVendas);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rota para atualizar o estoque do produto (Bloqueia se for Cliente)
app.put('/api/produtos/:id_produto', async (req, res) => {
  const nivelAcesso = req.headers['user-level'];

  if (nivelAcesso === 'Client') {
    return res.status(403).json({ 
      erro: 'Acesso negado: Clientes possuem apenas permissão de visualização e não podem alterar dados.' 
    });
  }

  const { id_produto } = req.params;
  const { novoEstoque } = req.body;

  try {
    const produtoAtualizado = await Produto.findOneAndUpdate(
      { id_produto: Number(id_produto) },
      { estoque: novoEstoque },
      { new: true }
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    res.json({ mensagem: 'Estoque updated com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rota para excluir cliente (Bloqueia se for Cliente)
app.delete('/api/clientes/:id', async (req, res) => {
  const nivelAcesso = req.headers['user-level'];

  if (nivelAcesso === 'Client') {
    return res.status(403).json({ 
      erro: 'Acesso negado: Clientes possuem apenas permissão de visualização e não podem excluir registros.' 
    });
  }

  const { id } = req.params;

  try {
    const clienteDeletado = await Cliente.findOneAndDelete({ 
      id_cliente: Number(id) 
    });

    if (!clienteDeletado) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    res.json({ mensagem: 'Cliente excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Exporta o app para a Vercel gerenciar em modo Serverless
export default app;

// Só roda o app.listen se NÃO estiver rodando dentro do ambiente de produção da Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}
