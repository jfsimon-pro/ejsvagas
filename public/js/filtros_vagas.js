document.addEventListener('DOMContentLoaded', function() {
    // Manipulação do dropdown de educação
    const filterEducacao = document.getElementById('filter-educacao');
    const dropdownEducacao = document.getElementById('dropdown-educacao');
    const escolaridadeInput = document.getElementById('escolaridade');

    if (filterEducacao && dropdownEducacao) {
        // Mostrar/esconder dropdown ao clicar
        filterEducacao.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownEducacao.style.display = dropdownEducacao.style.display === 'block' ? 'none' : 'block';
        });

        // Selecionar opção do dropdown
        dropdownEducacao.addEventListener('click', function(e) {
            if (e.target.tagName === 'LI') {
                const value = e.target.getAttribute('data-value');
                escolaridadeInput.value = value;
                console.log('Escolaridade selecionada:', value); // Debug
                filterEducacao.querySelector('span:first-child').textContent = e.target.textContent;
                dropdownEducacao.style.display = 'none';
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!filterEducacao.contains(e.target)) {
                dropdownEducacao.style.display = 'none';
            }
        });

        // Adicionar evento de submit ao formulário
        const form = document.querySelector('form.search-bar');
        if (form) {
            form.addEventListener('submit', function(e) {
                // Garantir que o valor da escolaridade seja enviado
                if (!escolaridadeInput.value) {
                    escolaridadeInput.value = '';
                }
                console.log('Form submit - escolaridade:', escolaridadeInput.value);
            });
        }

        // Inicializar o valor da escolaridade se já existir
        const currentEscolaridade = filterEducacao.querySelector('span:first-child').textContent;
        if (currentEscolaridade && currentEscolaridade !== 'Educação') {
            escolaridadeInput.value = currentEscolaridade;
            console.log('Escolaridade inicial:', currentEscolaridade);
        }
    }

    // Manipulação do dropdown de tipo de contrato
    const filterTipo = document.getElementById('filter-tipo');
    const tipoContratoSelect = filterTipo.querySelector('select');

    if (filterTipo && tipoContratoSelect) {
        tipoContratoSelect.addEventListener('change', function() {
            filterTipo.querySelector('span:first-child').textContent = this.options[this.selectedIndex].text;
        });
    }

    // Manipulação do dropdown de UF
    const filterLocal = document.getElementById('filter-local');
    const ufSelect = filterLocal.querySelector('select');

    if (filterLocal && ufSelect) {
        ufSelect.addEventListener('change', function() {
            filterLocal.querySelector('span:first-child').textContent = this.options[this.selectedIndex].text;
        });
    }
}); 