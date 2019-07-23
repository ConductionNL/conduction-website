<?php
// src/Form/AmbtenaarType.php
namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\FormBuilderInterface;


class ContactFormType extends AbstractType
{
	public function buildForm(FormBuilderInterface $builder, array $options)
	{
		$builder
		->add('burgerServiceNummer', TextType::class, [
				'attr' => ['class' => 'form-control'],
				'label' => 'BSN',
				'label_attr' => ['class' => 'control-label col-sm-2'],
				'required'   => true,
				'empty_data' => '563935704',
				
		])
		->add('adres', TextType::class, [
				'attr' => ['class' => 'form-control'],
				'label' => 'BAG',
				'label_attr' => ['class' => 'control-label col-sm-2'],
				'required'   => true,
				'empty_data' => 'https://bag.basisregistraties.overheid.nl/api/v1/nummeraanduidingen/0005200000035461',
				
		])
		->add('ingangsDatum', DateType::class, [
				'widget' => 'single_text',
				'attr' => ['class' => 'form-control'],
				'label' => 'Ingangs Datum',
				'label_attr' => ['class' => 'control-label col-sm-2'],
				'required'   => true
				
		])
		->add('opslaan', SubmitType::class, [
				'attr' => ['class' => 'btn btn-primary'],
				'label' => 'Insturen'
		])
		;
	}
}
