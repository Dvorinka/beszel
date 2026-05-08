#!/usr/bin/env node

// Test WhoisXML API for .eu domains
const testWhoisXML = async (domain) => {
    try {
        // Note: This would require a real API key to test
        console.log(`Testing WhoisXML API for: ${domain}`);
        console.log('Note: WhoisXML API requires an API key to test properly');
        
        // URL structure they use
        const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=YOUR_API_KEY&outputFormat=json&domainName=${domain}`;
        console.log(`WhoisXML URL: ${url}`);
        
        // Based on their code, WhoisXML should return expiry dates for .eu domains
        console.log('WhoisXML API typically provides expiry dates for .eu domains that TCP WHOIS does not');
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
};

testWhoisXML('bookra.eu');
testWhoisXML('sportcreative.eu');
