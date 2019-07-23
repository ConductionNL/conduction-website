<?php
// src/Controller/LuckyController.php
namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class HomeController extends AbstractController
{ 
	/**
	* @Route("/")
	*/
	public function homeAction(Request $request)
	{
		
		$variables = [];
		$variables['title'] = urlencode ('Conduction');
		$variables['url'] = urlencode ($request->getUri());
		$variables['twitter_handle'] = urlencode ('conduction_nl');
		$variables['hash_tags'] = urlencode ('conduction,commonground');
		
		return $this->render('pages/home.html.twig', $variables);
	}
	/**
	 * @Route("/team")
	 */
	public function teamAction(Request $request)
	{
		$variables = [];
		$variables['title'] = urlencode ('Conduction');
		$variables['url'] = urlencode ($request->getUri());
		$variables['twitter_handle'] = urlencode ('conduction_nl');
		$variables['hash_tags'] = urlencode ('conduction,commonground');
		
		return $this->render('pages/team.html.twig', $variables);
	}
	/**
	 * @Route("/common-ground")
	 */
	public function commongroundAction(Request $request)
	{
		
		
		$variables = [];
		$variables['title'] = urlencode ('Conduction');
		$variables['url'] = urlencode ($request->getUri());
		$variables['twitter_handle'] = urlencode ('conduction_nl');
		$variables['hash_tags'] = urlencode ('conduction,commonground');
		
		return $this->render('pages/commonground.html.twig', $variables);
	}
	/**
	 * @Route("/webservice")
	 */
	public function webserviceAction()
	{
		
		return $this->render('pages/webservice.html.twig', [
		]);
	}
	/**
	 * @Route("/beveiliging")
	 */
	public function beveiligingAction()
	{
		
		return $this->render('pages/beveiliging.html.twig', [
		]);
	}
	/**
	 * @Route("/werkwijze")
	 */
	public function werkwijzeAction()
	{
		
		return $this->render('pages/werkwijze.html.twig', [
		]);
	}
	
	/* Dan conversie routes */
	
	
	/**
	 * Deze route wordt gebruikt om contact aanvragen te registreren
	 * 
	 * @Route("/bedankt")
	 */
	public function bedanktAction()
	{
		
		return $this->render('pages/bedankt.html.twig', [
		]);
	}
	
	/**
	 * Deze route wordt gebruikt om inschrijvingen voor de nieuwsbrief te registreren
	 * 
	 * @Route("/nieuwsbrief")
	 */
	public function nieuwsbriefAction()
	{
		
		return $this->render('pages/nieuwsbrief.html.twig', [
		]);
	}
}
