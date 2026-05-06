import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Invoice, Quote } from "./types";
import { companyProfile } from "./config";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const styles = StyleSheet.create({
  page: { padding: 42, fontSize: 10, color: "#17120f", fontFamily: "Helvetica" },
  header: { backgroundColor: "#17120f", color: "#fffaf1", padding: 18, marginBottom: 18, borderRadius: 8 },
  brand: { fontSize: 24, fontWeight: 700, color: "#d9b889" },
  tagline: { fontSize: 10, marginTop: 4, color: "#f4eadb" },
  section: { marginBottom: 14, paddingBottom: 10, borderBottom: "1 solid #d9b889" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 6 },
  label: { color: "#7f351b", fontWeight: 700 },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: 7, color: "#b95424" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f4eadb", padding: 7, fontWeight: 700 },
  tableRow: { flexDirection: "row", padding: 7, borderBottom: "1 solid #eee1cc" },
  desc: { width: "50%" },
  small: { width: "16%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginTop: 6 },
});

export function quotePdfText(quote: Quote) {
  return `${companyProfile.name} Quote ${quote.quoteNumber} for ${quote.clientName} totaling ${currency(quote.total)}.`;
}

export function invoicePdfText(invoice: Invoice) {
  return `${companyProfile.name} Invoice ${invoice.invoiceNumber} for ${invoice.clientName} with ${currency(invoice.amountDue - invoice.amountPaid)} due.`;
}

function QuoteDocument({ quote }: { quote: Quote }) {
  return (
    <Document title={`Quote ${quote.quoteNumber}`} author={companyProfile.name}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}><Text style={styles.brand}>{companyProfile.name}</Text><Text style={styles.tagline}>{companyProfile.tagline}</Text></View>
        <View style={styles.section}><Text style={styles.h2}>Quote {quote.quoteNumber}</Text><Text>Client: {quote.clientName}</Text><Text>Property: {quote.propertyAddress}</Text><Text>Expires: {quote.expiresAt}</Text></View>
        <View style={styles.section}><Text style={styles.h2}>Scope of Work</Text><Text>{quote.scopeOfWork}</Text></View>
        <View style={styles.section}><Text style={styles.h2}>Included / Excluded</Text><Text><Text style={styles.label}>Included: </Text>{quote.includedWork}</Text><Text><Text style={styles.label}>Excluded: </Text>{quote.excludedWork}</Text></View>
        <View style={styles.section}><Text style={styles.h2}>Itemized Costs</Text><View style={styles.tableHeader}><Text style={styles.desc}>Description</Text><Text style={styles.small}>Type</Text><Text style={styles.small}>Qty</Text><Text style={styles.small}>Total</Text></View>{quote.lineItems.map((item) => <View style={styles.tableRow} key={item.id}><Text style={styles.desc}>{item.description}</Text><Text style={styles.small}>{item.type}</Text><Text style={styles.small}>{item.quantity}</Text><Text style={styles.small}>{currency(item.quantity * item.unitPrice)}</Text></View>)}<View style={styles.totalRow}><Text>Subtotal</Text><Text>{currency(quote.subtotal)}</Text></View><View style={styles.totalRow}><Text>Tax</Text><Text>{currency(quote.tax)}</Text></View><View style={styles.totalRow}><Text>Discount</Text><Text>{currency(quote.discount)}</Text></View><View style={styles.totalRow}><Text>Total</Text><Text>{currency(quote.total)}</Text></View><View style={styles.totalRow}><Text>Deposit</Text><Text>{currency(quote.depositRequired)}</Text></View></View>
        <View style={styles.section}><Text style={styles.h2}>Terms</Text><Text>{quote.terms}</Text></View>
      </Page>
    </Document>
  );
}

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={companyProfile.name}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}><Text style={styles.brand}>{companyProfile.name}</Text><Text style={styles.tagline}>{companyProfile.tagline}</Text></View>
        <View style={styles.section}><Text style={styles.h2}>Invoice {invoice.invoiceNumber}</Text><Text>Client: {invoice.clientName}</Text><Text>Due: {invoice.dueAt}</Text><Text>Status: {invoice.status}</Text></View>
        <View style={styles.section}><View style={styles.row}><Text>Amount due</Text><Text>{currency(invoice.amountDue)}</Text></View><View style={styles.row}><Text>Amount paid</Text><Text>{currency(invoice.amountPaid)}</Text></View><View style={styles.row}><Text style={styles.label}>Balance</Text><Text style={styles.label}>{currency(invoice.amountDue - invoice.amountPaid)}</Text></View></View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(quote: Quote) {
  return Buffer.from(await pdf(<QuoteDocument quote={quote} />).toBuffer());
}

export async function renderInvoicePdf(invoice: Invoice) {
  return Buffer.from(await pdf(<InvoiceDocument invoice={invoice} />).toBuffer());
}
