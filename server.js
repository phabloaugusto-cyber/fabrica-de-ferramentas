const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const SITE_NAME = process.env.SITE_NAME || "Fábrica de Ferramentas";

function brMoney(n) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function num(v) {
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  return Number(s);
}
function pctToDec(v) {
  const p = num(v);
  if (!isFinite(p)) return NaN;
  return p / 100;
}

app.get("/", (req, res) => res.render("home", { SITE_NAME }));

app.get("/juros", (req, res) => res.render("juros", { SITE_NAME, result: null, form: {} }));
app.post("/juros", (req, res) => {
  const form = req.body || {};
  const principal = num(form.principal);
  const jurosMes = pctToDec(form.juros_mes);
  const multa = pctToDec(form.multa);
  const meses = Math.max(0, Math.floor(num(form.meses) || 0));

  let result = null;
  if (isFinite(principal) && isFinite(jurosMes) && isFinite(multa)) {
    const comMulta = principal * (1 + multa);
    const montante = comMulta * Math.pow(1 + jurosMes, meses);
    const jurosTotal = montante - principal;
    result = { principal, meses, jurosMes, multa, comMulta, montante, jurosTotal };
  }
  res.render("juros", { SITE_NAME, result, form });
});

app.get("/pecuaria", (req, res) => res.render("pecuaria", { SITE_NAME, result: null, form: {} }));
app.post("/pecuaria", (req, res) => {
  const form = req.body || {};
  const qtd = Math.max(1, Math.floor(num(form.quantidade) || 0));
  const pesoEntrada = num(form.peso_entrada);
  const pesoSaida = num(form.peso_saida);
  const precoArrobaCompra = num(form.preco_arroba_compra);
  const precoArrobaVenda = num(form.preco_arroba_venda);
  const custoCabeca = num(form.custo_por_cabeca);
  const arrobaKg = 15;

  let result = null;
  if ([qtd, pesoEntrada, pesoSaida, precoArrobaCompra, precoArrobaVenda].every(isFinite) && qtd > 0) {
    const arrobasEntrada = (pesoEntrada / arrobaKg);
    const arrobasSaida = (pesoSaida / arrobaKg);
    const custoCompraCab = arrobasEntrada * precoArrobaCompra;
    const receitaVendaCab = arrobasSaida * precoArrobaVenda;
    const custoTotalCab = custoCompraCab + (isFinite(custoCabeca) ? custoCabeca : 0);
    const lucroCab = receitaVendaCab - custoTotalCab;

    result = {
      qtd, pesoEntrada, pesoSaida, precoArrobaCompra, precoArrobaVenda,
      custoCabeca: isFinite(custoCabeca) ? custoCabeca : 0,
      arrobasEntrada, arrobasSaida,
      custoCompraCab, receitaVendaCab, custoTotalCab, lucroCab,
      totalCusto: custoTotalCab * qtd,
      totalReceita: receitaVendaCab * qtd,
      totalLucro: lucroCab * qtd
    };
  }
  res.render("pecuaria", { SITE_NAME, result, form });
});

app.get("/contrato", (req, res) => res.render("contrato", { SITE_NAME, doc: null, form: {} }));
app.post("/contrato", (req, res) => {
  const f = req.body || {};
  const valor = num(f.valor);
  const jurosMes = pctToDec(f.juros_mes);

  const doc = {
    credor_nome: (f.credor_nome || "").trim(),
    credor_cpf: (f.credor_cpf || "").trim(),
    devedor_nome: (f.devedor_nome || "").trim(),
    devedor_cpf: (f.devedor_cpf || "").trim(),
    valor: isFinite(valor) ? brMoney(valor) : "—",
    juros_mes: isFinite(jurosMes) ? (jurosMes * 100).toFixed(2).replace(".", ",") + "% ao mês" : "—",
    vencimento: String(f.vencimento || "").trim(),
    cidade: String(f.cidade || "").trim(),
    data: String(f.data || "").trim()
  };

  res.render("contrato", { SITE_NAME, doc, form: f });
});

app.get("/recibo", (req, res) => res.render("recibo", { SITE_NAME, doc: null, form: {} }));
app.post("/recibo", (req, res) => {
  const f = req.body || {};
  const valor = num(f.valor);
  const doc = {
    pagador: (f.pagador || "").trim(),
    recebedor: (f.recebedor || "").trim(),
    referencia: (f.referencia || "").trim(),
    valor: isFinite(valor) ? brMoney(valor) : "—",
    data: (f.data || "").trim(),
    cidade: (f.cidade || "").trim()
  };
  res.render("recibo", { SITE_NAME, doc, form: f });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`[OK] ${SITE_NAME} rodando na porta ${port}`));
