# Criterios de seguranca

Revise os caminhos alterados e seus chamadores. Para cada item aplicavel, indique a evidencia ou a lacuna.

- **Entrada externa.** Confira a validacao e conversao de dados externos antes do uso.
- **Autorizacao.** Confira no servidor a permissao sobre o recurso acessado.
- **Dados e segredos.** Inspecione o diff e as saidas de logs, erros, traces e eventos. Confira que testes, fixtures e prints usam dados de teste ou mascarados. Siga as regras do repositorio para armazenar segredos.
- **Ambiente compartilhado.** Confira se a operacao preserva dados e recursos de outras sessoes conforme as regras do ambiente.
- **Falha segura.** Confira que falhas de validacao, permissao ou dependencia retornam erro tratado e preservam as restricoes de acesso.

Encaminhe o resultado pelo estado da revisao.
