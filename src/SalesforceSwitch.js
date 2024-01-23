import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SalesforceSwitch.css'

const SalesforceSwitch = () => {
  const [accessToken, setAccessToken] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [validationRules, setValidationRules] = useState([]);
  const redirectUri = 'http://localhost:3000/callback';


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const instanceUrl = urlParams.get('instance_url');

    if (accessToken && instanceUrl) {
      setAccessToken(accessToken);
      setInstanceUrl(instanceUrl);

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = () => {
    let clientId = '3MVG9pRzvMkjMb6mE2LIHvgrZZnFLzUe34sEfKwfU5ER1BFmoOqDAWgcd.xwtKVKq7eURSTRl0YDpygc_otJ7';
    
    const salesforceInstanceUrl = 'https://login.salesforce.com'
    const loginUrl = `${salesforceInstanceUrl}/services/oauth2/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}`;

    window.location.href = loginUrl;

  };

  const getValidationRules = async () => {
    try {
      const response = await axios.get(
        `${instanceUrl}/services/data/v54.0/tooling/query?q=SELECT+Id,Active+FROM+ValidationRule+WHERE+EntityDefinition.QualifiedApiName='Account'`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
      );
  
      const validationRules = response.data.records;
      const validationRuleIds = validationRules.map(rule => rule.Id);
      console.log(validationRuleIds);
      const detailedValidationRules = await Promise.all(
        validationRuleIds.map(async id => {
          const detailResponse = await axios.get(
            `${instanceUrl}/services/data/v54.0/tooling/sobjects/ValidationRule/${id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          return detailResponse.data;
        })
      );
  
      
      const validationRulesWithDetails = validationRules.map((rule, index) => ({
        ...rule,
        FullName: detailedValidationRules[index].FullName,
      }));

      setValidationRules(validationRulesWithDetails);
    } catch (error) {
      console.error(
        'Error fetching validation rules:',
        error.response ? error.response.data : error.message
      );
    }
  };
  

  const handleCheckboxChange = (ruleId) => {
    setValidationRules(prevRules =>
      prevRules.map(rule =>
        rule.Id === ruleId ? { ...rule, Active: !rule.Active } : rule
      )
    );
  };

  
  const deployChanges = (ruleId,isActive) => {

    axios
      .patch(
        `${instanceUrl}/services/data/v54.0/tooling/sobjects/ValidationRule/${ruleId}`,
        {
          "Metadata": {
              "active": isActive,
              "errorConditionFormula": "NOT(ISNULL(Name))",
              "errorMessage": "Error message"
          }
      },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      .then((response) => {
        console.log('Validation rule status updated successfully:', response.data);
        getValidationRules();
      })
      .catch((error) => {
        console.error(
          'Error updating validation rule status:',
          error.response ? error.response.data : error.message
        );
      });
  };

  const deployAll = () => {
    for(let i=0;i<validationRules.length;i++){
      deployChanges(validationRules[i].Id,validationRules[i].Active);
    }
  }

  const enableAll = (status) =>{
   const updatedRules = validationRules.map((rule)=>({
    ...rule,
    'Active':status
   }))
   setValidationRules(updatedRules);
   console.log(validationRules)
  }

  const handleLogout = () => {    
    window.location.href=`${instanceUrl}/secur/logout.jsp?retURL=https://login.salesforce.com`;
    setAccessToken(null);
    setInstanceUrl(null);
    window.location.href = `${redirectUri}`
  }


  return (
    <div>
      {!accessToken ? (
        <div class="login">
          <h2>Salesforce Switch</h2>
          <p>This tool provides an interface to easily enable and disable components in your Salesforce Org</p>
          <button onClick={handleLogin} class="logbt">Login to Salesforce</button>
        </div>
      ) : (
        <div>
          <h3>Successfully connected to Salesforce!       <button onClick={handleLogout} className='logout'>Logout</button></h3>
          
          <div class="button">
            <button onClick={getValidationRules} className="bt1">Get Validation Rules</button>
            <button onClick={deployAll} class="bt2">Deploy changes</button>
            <button onClick={()=>enableAll(true)} className="bt3">Enable all</button>
            <button onClick={()=>enableAll(false)} className="bt4">Disable all</button>
            
          </div>

          {validationRules.length > 0 && (
            <div className='table-container'>
              <h2>Validation Rules:</h2>
              <div>
                <table className='table'>
                  <thead>
                    <tr >
                      <th>Validation Rule</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                  {validationRules.map(rule => (
                    <tr key={rule.Id}>
                      <td>{rule.FullName}</td> 
                      <td><input
                        type="checkbox"
                        checked={rule.Active}
                        onChange={() => handleCheckboxChange(rule.Id)}
                      /> </td> 
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
              
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesforceSwitch;
