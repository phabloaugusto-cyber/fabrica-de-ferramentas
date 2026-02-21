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


// 5) Simulador de Financiamento (juros mensais)
app.get("/financiamento", (req, res) => {
  res.render("financiamento", { SITE_NAME, result: null, form: {} });
});

app.post("/financiamento", (req, res) => {
  const form = req.body || {};
  const valor = num(form.valor);
  const entrada = num(form.entrada);
  const meses = Math.max(1, Math.floor(num(form.meses) || 0));
  const jurosMes = pctToDec(form.juros_mes);

  let result = null;
  if (isFinite(valor) && isFinite(entrada) && isFinite(jurosMes) && meses > 0) {
    const principal = Math.max(0, valor - entrada);
    // parcela fixa (Price): P * i*(1+i)^n / ((1+i)^n - 1)
    const i = jurosMes;
    let parcela = 0;
    if (i === 0) {
      parcela = principal / meses;
    } else {
      const pow = Math.pow(1 + i, meses);
      parcela = principal * (i * pow) / (pow - 1);
    }
    const totalPago = parcela * meses + entrada;
    const jurosTotal = totalPago - valor;

    result = { valor, entrada, principal, meses, jurosMes, parcela, totalPago, jurosTotal };
  }

  res.render("financiamento", { SITE_NAME, result, form });
});

// 6) Calculadora de Salário Líquido (aproximação)
app.get("/salario", (req, res) => {
  res.render("salario", { SITE_NAME, result: null, form: {} });
});

app.post("/salario", (req, res) => {
  const form = req.body || {};
  const bruto = num(form.bruto);
  const dependentes = Math.max(0, Math.floor(num(form.dependentes) || 0));

  let result = null;
  if (isFinite(bruto) && bruto >= 0) {
    // INSS 2024/2025-like (aproximação por faixas progressivas) – bom p/ simulação
    const faixas = [
      { teto: 1412.00, aliq: 0.075 },
      { teto: 2666.68, aliq: 0.09 },
      { teto: 4000.03, aliq: 0.12 },
      { teto: 7786.02, aliq: 0.14 },
    ];
    let base = bruto;
    let inss = 0;
    let prevTeto = 0;
    for (const f of faixas) {
      const faixaBase = Math.min(base, f.teto) - prevTeto;
      if (faixaBase > 0) inss += faixaBase * f.aliq;
      prevTeto = f.teto;
    }
    // Teto INSS (aprox). Mantemos o cálculo progressivo, que já limita.
    const baseIr = Math.max(0, bruto - inss - dependentes * 189.59); // dedução por dependente (aprox)
    // IRRF (aproximação mensal por faixas)
    const irFaixas = [
      { teto: 2259.20, aliq: 0, ded: 0 },
      { teto: 2826.65, aliq: 0.075, ded: 169.44 },
      { teto: 3751.05, aliq: 0.15, ded: 381.44 },
      { teto: 4664.68, aliq: 0.225, ded: 662.77 },
      { teto: Infinity, aliq: 0.275, ded: 896.00 },
    ];
    let ir = 0;
    for (const f of irFaixas) {
      if (baseIr <= f.teto) { ir = Math.max(0, baseIr * f.aliq - f.ded); break; }
    }
    const liquido = bruto - inss - ir;
    result = { bruto, dependentes, inss, baseIr, ir, liquido };
  }

  res.render("salario", { SITE_NAME, result, form });
});

// 7) Pecuária (avançada)
app.get("/pecuaria-plus", (req, res) => {
  res.render("pecuaria_plus", { SITE_NAME, result: null, form: {} });
});

app.post("/pecuaria-plus", (req, res) => {
  const form = req.body || {};
  const qtd = Math.max(1, Math.floor(num(form.quantidade) || 0));
  const pesoEntrada = num(form.peso_entrada); // kg
  const pesoSaida = num(form.peso_saida);     // kg
  const precoArrobaCompra = num(form.preco_arroba_compra);
  const precoArrobaVenda = num(form.preco_arroba_venda);
  const custoCabeca = num(form.custo_por_cabeca); // R$
  const dias = Math.max(0, Math.floor(num(form.dias) || 0));
  const custoDia = num(form.custo_por_dia); // R$ por cabeça/dia (ração, mineral, etc)
  const arrobaKg = 15;

  let result = null;
  if ([qtd, pesoEntrada, pesoSaida, precoArrobaCompra, precoArrobaVenda].every(isFinite) && qtd > 0) {
    const arrobasEntrada = pesoEntrada / arrobaKg;
    const arrobasSaida = pesoSaida / arrobaKg;

    const custoCompraCab = arrobasEntrada * precoArrobaCompra;
    const custoVariavelCab = (isFinite(custoCabeca) ? custoCabeca : 0) + (isFinite(custoDia) ? custoDia * dias : 0);
    const custoTotalCab = custoCompraCab + custoVariavelCab;

    const receitaVendaCab = arrobasSaida * precoArrobaVenda;
    const lucroCab = receitaVendaCab - custoTotalCab;

    const ganhoKg = pesoSaida - pesoEntrada;
    const ganhoArroba = ganhoKg / arrobaKg;

    // preço de venda break-even (arroba) para empatar
    const precoVendaEmpate = arrobasSaida > 0 ? (custoTotalCab / arrobasSaida) : NaN;

    result = {
      qtd, pesoEntrada, pesoSaida, precoArrobaCompra, precoArrobaVenda,
      dias, custoDia: isFinite(custoDia) ? custoDia : 0,
      custoCabeca: isFinite(custoCabeca) ? custoCabeca : 0,
      arrobasEntrada, arrobasSaida, ganhoKg, ganhoArroba,
      custoCompraCab, custoVariavelCab, custoTotalCab,
      receitaVendaCab, lucroCab,
      totalCusto: custoTotalCab * qtd,
      totalReceita: receitaVendaCab * qtd,
      totalLucro: lucroCab * qtd,
      precoVendaEmpate
    };
  }

  res.render("pecuaria_plus", { SITE_NAME, result, form });
});


// Healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

// Páginas institucionais
app.get("/privacidade", (req, res) => {
  res.render("privacidade", { SITE_NAME, title: "Política de Privacidade" });
});

app.get("/termos", (req, res) => {
  res.render("termos", { SITE_NAME, title: "Termos de Uso" });
});

app.get("/contato", (req, res) => {
  res.render("contato", { SITE_NAME, title: "Contato" });
});

app.get("/sobre", (req, res) => {
  res.render("sobre", { SITE_NAME, title: "Sobre" });
});
app.get("/ferramentas", (req, res) => {
  res.render("ferramentas", { SITE_NAME, title: "Ferramentas" });
});
// Start
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`[OK] ${SITE_NAME} rodando na porta ${port}`));

