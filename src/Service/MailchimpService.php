<?php
// src/Service/AmbtenaarService.php
namespace App\Service;

use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use MailchimpAPI\Mailchimp;

class MailchimpService
{
	private $params;
	private $mailchimp;
	
	public function __construct(ParameterBagInterface $params)
	{
		$this->params = $params;
		$this->mailchimp = new Mailchimp('123abc123abc123abc123abc-us0');
	}
		
	public function registerContact($subscriber)
	{
		$merge_values = [
				"FNAME" => "John",
				"LNAME" => "Doe"
		];
		
		$post_params = [
				"email_address" => "example@domain.com",
				"status" => "subscribed",
				"email_type" => "html",
				"merge_fields" => $merge_values
		];		
		
		$mailchimp
		->lists('1a2b3c4d')
		->members()
		->post($post_params);
		
		return $mailchimp;
	}
}
