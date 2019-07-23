<?php
// src/Service/AmbtenaarService.php
namespace App\Service;

use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Mailgun\Mailgun;

class MailgunService
{
	private $params;
	private $mailgun;
	
	public function __construct(ParameterBagInterface $params)
	{
		$this->params = $params;
		$this->mailgun = Mailgun::create($params->get('mailgun.key')); // For nonEU servers
		//$this->mailgun = Mailgun::create($params->get('mailgun.key'), 'https://api.eu.mailgun.net'); // For EU servers
	}
		
	public function subscribe($email, $name, $list)
	{
		if(!$list){
			$list = $params->get('mailgun.list');
		}
		
		return $this->mailgun->mailingList->member->create($list, $email, $name);
	}
	
}
