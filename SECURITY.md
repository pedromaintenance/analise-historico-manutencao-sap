# Segurança e segregação dos dados

O código é público, mas **nenhuma exportação operacional, cadastro de equipamento real, nota, ordem, reserva, custo ou informação pessoal** deve ir para GitHub, PRs, Issues, imagens, logs ou testes.

O HTML realiza processamento em memória depois do upload manual e não possui API de upload, banco de dados, cookies, localStorage ou telemetria. Downloads do navegador ficam sob responsabilidade do usuário no ambiente corporativo autorizado.

**Atenção à cadeia de suprimento:** o leitor XLSX é carregado de CDN público. Ainda que o código próprio não envie dados, JavaScript de terceiros executado na mesma página tem acesso aos dados carregados. Para bases confidenciais, use somente após aprovação da TI, com biblioteca vendorizada/auditada, pinagem de integridade e execução preferencialmente sem rede. CSV funciona sem a biblioteca. Não colocar arquivos reais na pasta pública do GitHub Pages.

Se dados reais forem versionados por engano, remover o arquivo em um novo commit **não** apaga o histórico. Interromper publicação, seguir plano corporativo de resposta, avaliar exposição e limpar histórico com procedimento formal.
