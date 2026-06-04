window.TAForms={
  values(form){return Object.fromEntries(new FormData(form).entries())},
  checkedValues(form,name){return [...form.querySelectorAll('[name="'+name+'"]:checked')].map(i=>i.value)},
  lines(root,selector){return [...root.querySelectorAll(selector)].map((row)=>Object.fromEntries([...row.querySelectorAll('input, textarea, select')].map((field)=>[field.name,field.value])))},
  moneyToCents(value){return Math.round(Math.max(0,Number(value||0))*100)},
  centsToMoney(value){return (Number(value||0)/100).toFixed(2)}
};
