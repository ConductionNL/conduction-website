<?php
// src/Controller/LuckyController.php
namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class HomeController extends AbstractController
{ 
	/**
	* @Route("/")
	*/
	public function homeAction()
	{
		
		return $this->render('pages/home.html.twig', [
		]);
	}
	/**
	 * @Route("/team")
	 */
	public function teamAction()
	{
		
		return $this->render('pages/team.html.twig', [
		]);
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
}
