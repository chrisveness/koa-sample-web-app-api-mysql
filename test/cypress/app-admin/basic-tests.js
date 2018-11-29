/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Cypress front-end integration tests - basic example.                                           */
/*                                                                                                */
/* To run tests interactively, use 'open cypress' command.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* global Cypress, cy */


describe('Basic front-end tests', function () {
    const adminApp = 'http://admin.localhost:3000';

    it('Adds & deletes a member', function() {
        const testuser = Cypress.env('TESTUSER');
        const testpass = Cypress.env('TESTPASS');

        cy.visit(adminApp+'/login');
        cy.get('input[name=username]').type(testuser);
        cy.get('input[name=password]').type(testpass);
        cy.get('button').click();

        cy.url().should('include', '/');

        cy.get('nav').contains('members').click();
        cy.url().should('include', '/members');

        cy.get('a[title="add member"]').click();
        cy.url().should('include', '/members/add');

        cy.get('input[name=Firstname]').type('Cypress');
        cy.get('input[name=Lastname]').type('Test');
        cy.get('input[name=Email]').type('cypress@test.com');
        cy.get('button').click();
        cy.url().should('include', '/members');

        cy.contains('Cypress').closest('tr').find('a[title="delete member"]').click();
        cy.url().should('include', '/delete');
        cy.get('button').click();
        cy.url().should('include', '/members');

        cy.get('nav').contains('logout').click();
        cy.url().should('include', '/');
    });
});
