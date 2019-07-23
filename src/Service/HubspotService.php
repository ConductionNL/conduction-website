<?php
// src/Service/AmbtenaarService.php
namespace App\Service;

use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use GuzzleHttp\Client ;

class HubspotService
{
	private $params;
	private $mailgun;
	
	public function __construct(ParameterBagInterface $params)
	{
		$this->params = $params;
		
		$this->client= new Client([
				// Base URI is used with relative requests
				'base_uri' => 'http://api.taartenwinkel.nl/',
				// You can set any number of default request options.
				'timeout'  => 4000.0,
		]);
	}
		
	public function subscribe($email, $name, $list)
	{
		if(!$list){
			$list = $params->get('mailgun.list');
		}
		
		return $this->mailgun->mailingList->member->create($list, $email, $name);
	}
	
	public function contactform($email, $name, $list)
	{
		if(!$list){
			$list = $params->get('mailgun.list');
		}
		
		return $this->mailgun->mailingList->member->create($list, $email, $name);
	}
	
}
